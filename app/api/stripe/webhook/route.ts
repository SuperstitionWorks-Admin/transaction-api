import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getDb } from '@/lib/db';
import { PLANS, getPlanById, type PlanId } from '@/lib/plans';
import { generateApiKey, hashApiKey } from '@/lib/hash';

// ─── Config ───────────────────────────────────────────────────────────────────

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing env var: STRIPE_WEBHOOK_SECRET');
  return secret;
}

function getPlanByStripePriceId(priceId: string): { id: PlanId; monthlyLimit: number } | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) {
    return { id: 'starter', monthlyLimit: 10000 };
  }

  if (priceId === process.env.STRIPE_PRICE_PRO) {
    return { id: 'pro', monthlyLimit: 100000 };
  }

  return null;
}

const FREE_PLAN = PLANS.find((p) => p.id === 'free');
const FREE_LIMIT = FREE_PLAN?.requestLimit ?? 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely converts a Stripe epoch timestamp to an ISO string.
 *
 * current_period_end is typed as `number` in older Stripe SDK versions but
 * may be absent or non-numeric at runtime depending on the pinned API version.
 * Calling new Date(NaN).toISOString() throws a RangeError — this was the root
 * cause of the 500: api_keys wrote successfully (it runs first), then this
 * crash prevented the subscriptions row from ever being inserted.
 */
function epochToISOSafe(value: unknown, label: string): string | null {
  if (typeof value !== 'number' || isNaN(value)) {
    console.warn(`[webhook] ${label} is not a valid epoch number:`, value);
    return null;
  }
  const date = new Date(value * 1000);
  if (isNaN(date.getTime())) {
    console.warn(`[webhook] ${label} produced an invalid Date from value:`, value);
    return null;
  }
  return date.toISOString();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: 'Could not read body' }, { status: 400 });
  }

  // Use request.headers directly — simpler and more reliable than importing
  // headers() from next/headers, which requires an active App Router async
  // context and adds an unnecessary await.
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[webhook] Received event: ${event.type} (id: ${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      // NOTE: customer.subscription.created is intentionally NOT handled here.
      // It fires alongside checkout.session.completed for new subscriptions,
      // and checkout.session.completed is the correct place to provision access
      // because it carries the metadata (planId, userId) set at checkout time.
      // Handling both would double-process every new subscription.

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        // Acknowledge without processing — Stripe retries unacknowledged events
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries the event. Log the full error for debugging.
    console.error(`[webhook] Error handling ${event.type} (id: ${event.id}):`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Fires once when the customer completes the Stripe-hosted checkout form.
 * This is the single place we provision access.
 *
 * IMPORTANT: metadata.userId must be set when creating the checkout session
 * so we can link the subscription to the right user/API key.  Without it we
 * cannot attribute access to anyone.
 * See checkout route: metadata: { planId, userId: session.user.id }
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[webhook] handleCheckoutCompleted session.id=${session.id}`);

  const { customer, subscription, metadata } = session;

  if (!customer || !subscription) {
    console.error('[webhook] checkout.session.completed missing customer or subscription', {
      sessionId: session.id,
      customer,
      subscription,
    });
    return;
  }

  if (!metadata?.planId) {
    console.error(
      '[webhook] checkout.session.completed missing metadata.planId — was it set at checkout?',
      { sessionId: session.id, metadata }
    );
    return;
  }

  // Warn loudly if userId is missing — access will be created but not linked.
  if (!metadata?.userId) {
    console.warn(
      '[webhook] checkout.session.completed missing metadata.userId. ' +
        'The API key will be created but cannot be linked to a user account. ' +
        'Add userId to checkout session metadata.'
    );
  }

  const customerId     = typeof customer     === 'string' ? customer     : customer.id;
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;

  console.log(`[webhook] customerId=${customerId} subscriptionId=${subscriptionId}`);

  // Cast to any once here — db.ts has no Database generic, so every table
  // resolves to `never` without it.  A single cast is cleaner than sprinkling
  // `as any` on every individual query.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getDb() as any;

  // Idempotency guard: if this event was already processed, skip it.
  const { data: existingSub } = await db
    .from('subscriptions')
    .select('id, api_key_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (existingSub) {
    // Already processed (e.g. Stripe retried the event). Nothing to do.
    console.log(`[webhook] Already processed subscriptionId=${subscriptionId}, skipping.`);
    return;
  }

  // Fetch the full subscription to get the priceId.
  const subscriptionData = await getStripe().subscriptions.retrieve(subscriptionId);

  const firstItem = subscriptionData.items?.data?.[0];

  if (!firstItem) {
    console.error('[webhook] Subscription has no line items', {
      subscriptionId,
      itemCount: subscriptionData.items?.data?.length ?? 0,
    });
    throw new Error('Missing line items in subscription');
  }

  const priceId = firstItem.price?.id;

  if (!priceId) {
    console.error('[webhook] Missing price ID on subscription item', {
      subscriptionId,
      item: firstItem,
    });
    throw new Error('Missing price ID in subscription item');
  }

  console.log(`[webhook] priceId=${priceId}`);

  const plan = getPlanByStripePriceId(priceId);

  if (!plan) {
    // Throw (not return) so Stripe retries — this could be a transient config
    // issue (e.g. env vars not yet deployed) rather than a permanent bad event.
    console.error('[webhook] No plan mapped for priceId. Check env vars.', {
      priceId,
      STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER ?? '(not set)',
      STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO ?? '(not set)',
    });
    throw new Error(`No plan found for priceId: ${priceId}`);
  }

  console.log(`[webhook] Mapped plan: ${plan.id} (monthlyLimit: ${plan.monthlyLimit})`);

  // ── Provision the API key ────────────────────────────────────────────────
  //
  // Look for an existing key tied to this Stripe customer first — upgrades
  // should update the limit on the existing key, not create a second one.

  let apiKeyId: string;
  let rawKey: string | null = null;

  const { data: existingKey } = await db
    .from('api_keys')
    .select('id')
    .eq('user_id', metadata.userId)
    .maybeSingle() as { data: { id: string } | null };

  if (existingKey) {
    apiKeyId = existingKey.id;
    // Update the limit in place — don't generate a new key on upgrade.
    await db
      .from('api_keys')
      .update({ monthly_limit: plan.monthlyLimit, is_active: true })
      .eq('id', apiKeyId);
    console.log(`[webhook] Updated existing api_key id=${apiKeyId}`);
  } else {
    // New customer: generate a real cryptographic key and store only its hash.
    rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);

    const { data: newKey, error: insertError } = await db
      .from('api_keys')
      .insert({
        name: `${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)} Plan`,
        key_hash: keyHash,
        monthly_limit: plan.monthlyLimit,
        is_active: true,
        userId: metadata.userId,
        ...(metadata?.userId ? { user_id: metadata.userId } : {}),
      })
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (insertError || !newKey) {
      console.error('[webhook] Failed to insert API key', insertError);
      // Throw so Stripe retries. The idempotency guard above prevents
      // double-insertion once a retry succeeds.
      throw new Error('Failed to insert API key');
    }

    apiKeyId = newKey.id;
    console.log(`[webhook] Created new api_key id=${apiKeyId}`);
  }

  // TODO: deliver rawKey to the user.
  // Options (pick one):
  //   1. Store temporarily in a `pending_api_keys` table; read on success page
  //   2. Send a transactional email via Resend / SendGrid
  //   3. Encrypt and embed in the Stripe success_url as a query param
  // Without this step the user receives no key to authenticate with.
  if (rawKey) {
    console.log(
      `[ACTION REQUIRED] New API key created for customer ${customerId}. ` +
        `Raw key must be delivered to the user. keyId=${apiKeyId}`
    );
  }

  // ── Record the subscription ──────────────────────────────────────────────

  // current_period_end is not guaranteed to be a top-level typed property
  // for all pinned Stripe API versions. Read it through a plain Record cast
  // and convert safely — an invalid epoch used to crash toISOString() here
  // and silently abort the insert (while the api_keys write above succeeded).
  const rawPeriodEnd = subscriptionData.items?.data?.[0]?.current_period_end;
  console.log(`[webhook] current_period_end raw value:`, rawPeriodEnd);
  const currentPeriodEnd = epochToISOSafe(rawPeriodEnd, 'current_period_end');

  const { error: subError } = await db.from('subscriptions').insert({
    api_key_id: apiKeyId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan: plan.id,
    status: subscriptionData.status,
    // null is intentional — the column should allow it so a bad epoch never
    // blocks the row from being inserted at all.
    current_period_end: currentPeriodEnd,
  });

  if (subError) {
    console.error('[webhook] Failed to insert subscription row', subError);
    throw new Error('Subscription insert failed');
  }

  console.log(`[webhook] Subscription row inserted for subscriptionId=${subscriptionId}`);
}

/**
 * Fires on plan changes (upgrade/downgrade) and status changes (e.g. past_due).
 * Does NOT fire for new subscriptions — that's handled by checkout.session.completed.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[webhook] handleSubscriptionUpdated subscriptionId=${subscription.id}`);

  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error('[webhook] No price ID in updated subscription', {
      subscriptionId: subscription.id,
    });
    return;
  }

  console.log(`[webhook] priceId=${priceId}`);

  const plan = getPlanByStripePriceId(priceId);
  if (!plan) {
    console.error('[webhook] No plan found for priceId on update', { priceId });
    return;
  }

  console.log(`[webhook] Mapped plan: ${plan.id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getDb() as any;

  const { data: existingSub } = await db
    .from('subscriptions')
    .select('api_key_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle() as { data: { api_key_id: string } | null };

  if (!existingSub) {
    // Can happen if checkout.session.completed hasn't been processed yet.
    // Stripe event ordering is not guaranteed. The checkout handler will
    // create the record; this event can be safely ignored for now.
    console.warn('[webhook] subscription.updated received before checkout.session.completed', {
      subscriptionId: subscription.id,
    });
    return;
  }

  const isActive =
    subscription.status === 'active' || subscription.status === 'trialing';

  const rawPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
  console.log(`[webhook] current_period_end raw value:`, rawPeriodEnd);
  const currentPeriodEnd = epochToISOSafe(rawPeriodEnd, 'current_period_end');

  await db
    .from('subscriptions')
    .update({
      status: subscription.status,
      plan: plan.id,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  await db
    .from('api_keys')
    .update({
      monthly_limit: isActive ? plan.monthlyLimit : FREE_LIMIT,
      is_active: isActive,
    })
    .eq('id', existingSub.api_key_id);

  console.log(`[webhook] Updated subscription and api_key for subscriptionId=${subscription.id}`);
}

/**
 * Fires when a subscription is cancelled (immediately or at period end).
 * Downgrades the key to free-tier limits rather than deactivating — this
 * lets the customer keep using the API at the free rate without a
 * re-authentication step.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[webhook] handleSubscriptionDeleted subscriptionId=${subscription.id}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getDb() as any;

  const { data: existingSub } = await db
    .from('subscriptions')
    .select('api_key_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle() as { data: { api_key_id: string } | null };

  if (!existingSub) {
    console.error('[webhook] subscription.deleted: subscription not found', {
      subscriptionId: subscription.id,
    });
    return;
  }

  await db
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  // Downgrade to free tier limits — not deactivation.
  // Hard-deactivating would break the customer's integration immediately.
  await db
    .from('api_keys')
    .update({ monthly_limit: FREE_LIMIT, is_active: true })
    .eq('id', existingSub.api_key_id);

  console.log(`[webhook] Downgraded api_key to free tier for subscriptionId=${subscription.id}`);
}
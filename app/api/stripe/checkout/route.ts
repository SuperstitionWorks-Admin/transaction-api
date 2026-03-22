import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { getPlanById } from '@/lib/plans';

// ─── Server-side Stripe Price ID map ─────────────────────────────────────────
//
// Kept here — not in lib/plans.ts — so these env vars are never bundled into
// client code.  process.env is evaluated at request time on the server, so the
// values will be present as long as they're set in your Vercel environment.

const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
};

export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    //
    // TODO: verify the user's session here before creating a checkout session.
    // Without this, any unauthenticated caller can trigger a Stripe checkout.
    // Example with next-auth:
    //
    //   const session = await getServerSession(authOptions);
    //   if (!session?.user?.email) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    //   }
    //   const customerEmail = session.user.email;
    //
    // Then pass customerEmail to createCheckoutSession below.

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { planId } = body as Record<string, unknown>;

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    if (plan.id === 'free') {
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    // Resolve the Stripe Price ID server-side from env vars.
    const priceId = STRIPE_PRICE_IDS[plan.id];

    if (!priceId) {
      // Reached only if STRIPE_PRICE_* env vars are missing for this plan.
      console.error(
        `No Stripe Price ID configured for plan "${plan.id}". ` +
          'Check STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO in your environment.'
      );
      return NextResponse.json(
        { error: 'Plan not available' },
        { status: 503 }
      );
    }

    // Use an explicit env var for the base URL rather than the Origin header.
    // The Origin header can be absent (e.g. server-side fetches, some proxies)
    // or spoofed, and must never be used to construct callback URLs.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
      'http://localhost:3000';

    const checkoutUrl = await createCheckoutSession({
      priceId,
      successUrl: `${baseUrl}/dashboard?checkout=success`,
      cancelUrl: `${baseUrl}/pricing?checkout=cancelled`,
      // customerEmail,   // uncomment once auth is wired up
      metadata: { planId: plan.id },
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

import Stripe from 'stripe';

// ─── Lazy client ──────────────────────────────────────────────────────────────
//
// Initialised on first use rather than at module load, so a missing env var
// produces a clear error at the callsite instead of crashing the import graph.

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing env var: STRIPE_SECRET_KEY');
  }

  // Pin the API version to the one shown in your Stripe dashboard under
  // Developers → API version.  Updating it here without reading the Stripe
  // changelog can silently break webhook payloads.
  stripeInstance = new Stripe(key, {
    apiVersion: '2026-02-25.clover',
  });

  return stripeInstance;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  /** Pass the signed-in user's email so Stripe pre-fills the checkout form
   *  and the subscription can be linked back to the account. */
  customerEmail?: string;
  metadata?: Record<string, string>;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  customerEmail,
  metadata,
}: CreateCheckoutSessionParams): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    metadata,
  });

  // session.url is null when mode is not 'hosted' — it should always be set
  // here, but guard explicitly so callers never receive null.
  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return session.url;
}

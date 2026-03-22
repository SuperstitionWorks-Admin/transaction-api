// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  /** Stripe Price ID.  Required for every paid plan; absent only on 'free'. */
  priceId?: string;
  requestLimit: number;
  features: string[];
  popular?: boolean;
}

// ─── Plan definitions ─────────────────────────────────────────────────────────
//
// priceId values are read here so they appear as `undefined` if the env var is
// missing.  validatePlanConfig() (called at server startup) will catch that
// before any real request is served.

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    requestLimit: 500,
    features: [
      '500 requests per month',
      'Basic categorization',
      'Standard support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9,
    priceId: process.env.STRIPE_PRICE_STARTER,
    requestLimit: 10_000,
    popular: true,
    features: [
      '10,000 requests per month',
      'Advanced categorization',
      'Priority support',
      'Usage analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_PRO,
    requestLimit: 100_000,
    features: [
      '100,000 requests per month',
      'Advanced categorization',
      'Premium support',
      'Usage analytics',
      'Custom categories',
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find((p) => p.priceId === priceId);
}

/**
 * Validates that every paid plan has a Stripe Price ID configured.
 * Call this once during server startup (e.g. in instrumentation.ts or the
 * first request handler) so misconfiguration fails loudly at boot rather than
 * silently at checkout time.
 *
 * @throws if any paid plan is missing its priceId
 */
export function validatePlanConfig(): void {
  const missing = PLANS.filter((p) => p.price > 0 && !p.priceId).map(
    (p) => p.id
  );

  if (missing.length > 0) {
    throw new Error(
      `Stripe Price IDs not configured for plans: ${missing.join(', ')}. ` +
        'Set STRIPE_PRICE_STARTER and STRIPE_PRICE_PRO in your environment.'
    );
  }
}

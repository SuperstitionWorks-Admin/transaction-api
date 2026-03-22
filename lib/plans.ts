// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  requestLimit: number;
  features: string[];
  popular?: boolean;
}

// ─── Plan definitions ─────────────────────────────────────────────────────────
//
// No Stripe references here — this file is imported by client code and must
// never contain secrets or server-only env vars.
// Stripe Price IDs live exclusively in the server-side checkout route.

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

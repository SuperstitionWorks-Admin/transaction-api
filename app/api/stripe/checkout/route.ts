import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { getPlanById } from '@/lib/plans';

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

    if (!plan.priceId) {
      // This means STRIPE_PRICE_* env vars are not set.  validatePlanConfig()
      // should have caught this at startup — reaching here is a config error.
      console.error(`Plan "${plan.id}" has no priceId — check STRIPE_PRICE_* env vars`);
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
      priceId: plan.priceId,
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

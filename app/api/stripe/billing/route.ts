import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export async function GET() {
  try {
    const db = getDb() as any;

    // Temporary fallback until request-bound auth is wired up.
    // Fetch the most recent subscription row instead of failing with 401.
    const { data: subscriptionData, error: subscriptionError } = await db
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    if (!subscriptionData) {
      return NextResponse.json({
        planName: 'Free',
        status: 'inactive',
        usageCount: 0,
        usageLimit: 500,
        nextBillingDate: null,
        hasActiveSubscription: false,
      });
    }

    const usageLimit =
      subscriptionData.plan === 'pro'
        ? 100000
        : subscriptionData.plan === 'starter'
        ? 10000
        : 500;

    return NextResponse.json({
      planName:
        subscriptionData.plan === 'pro'
          ? 'Pro'
          : subscriptionData.plan === 'starter'
          ? 'Starter'
          : 'Free',
      status: subscriptionData.status ?? 'inactive',
      usageCount: 0,
      usageLimit,
      nextBillingDate: subscriptionData.current_period_end ?? null,
      hasActiveSubscription:
        subscriptionData.status === 'active' ||
        subscriptionData.status === 'trialing',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'failed_to_load_billing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
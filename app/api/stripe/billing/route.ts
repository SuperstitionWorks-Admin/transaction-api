import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export async function GET() {
  try {
    const db = getDb() as any;

    // Authenticate the request using Supabase's server-side auth.
    // getUser() validates the JWT from the cookie/header — it does not rely on
    // a client-supplied value, so this cannot be spoofed by the caller.
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Filter by user_id so each user only sees their own subscription.
    // Keeps order + limit so the most recent row wins if duplicates exist.
    const { data: subscriptionData, error: subscriptionError } = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
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
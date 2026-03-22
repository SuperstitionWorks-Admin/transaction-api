import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  //
  // The original code accepted customerId from the request body.
  // This lets any unauthenticated caller open the billing portal for ANY
  // Stripe customer — including other users.
  //
  // The customer ID must come from the server-side session, not the client.
  // Uncomment and adapt the block below once auth is wired up:
  //
  //   const session = await getServerSession(authOptions);
  //   if (!session?.user?.id) {
  //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  //   }
  //   const userId = session.user.id;
  //
  // Then look up the customer ID from your database:
  //
  //   const { data: keyRecord } = await getDb()
  //     .from('api_keys')
  //     .select('stripe_customer_id')
  //     .eq('user_id', userId)
  //     .maybeSingle();
  //
  //   if (!keyRecord?.stripe_customer_id) {
  //     return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  //   }
  //   const customerId = keyRecord.stripe_customer_id;
  //
  // For now this route returns 501 until auth is implemented.
  return NextResponse.json(
    { error: 'Billing portal requires authentication. See route comments.' },
    { status: 501 }
  );

  // ── Portal session ─────────────────────────────────────────────────────────
  //
  // Delete the return above and uncomment this block once auth is wired up.
  //
  // try {
  //   const baseUrl =
  //     process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  //     'http://localhost:3000';
  //
  //   const portalSession = await getStripe().billingPortal.sessions.create({
  //     customer: customerId,
  //     return_url: `${baseUrl}/billing`,
  //   });
  //
  //   return NextResponse.json({ url: portalSession.url });
  // } catch (error) {
  //   console.error('Error creating portal session:', error);
  //   return NextResponse.json(
  //     { error: 'Failed to create portal session' },
  //     { status: 500 }
  //   );
  // }
}

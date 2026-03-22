'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowRight, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { PLANS } from '@/lib/plans';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingData {
  planName: string;
  status: string;
  usageCount: number;
  usageLimit: number;
  nextBillingDate: string | null;
  hasActiveSubscription: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // ── Load billing data ────────────────────────────────────────────────────
  //
  // /api/stripe/billing must look up the current user's session server-side
  // and return BillingData. It must never accept a user-supplied customerId.

  useEffect(() => {
    async function loadBilling() {
      try {
        const res = await fetch('/api/stripe/billing');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load billing info (${res.status})`);
        }
        const data: BillingData = await res.json();
        setBilling(data);
      } catch (err) {
        setBillingError(
          err instanceof Error ? err.message : 'Could not load billing information.'
        );
      } finally {
        setLoadingBilling(false);
      }
    }

    loadBilling();
  }, []);

  // ── Manage billing portal ────────────────────────────────────────────────
  //
  // No customerId from the client — the server derives it from the session.

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setPortalError(null);

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Could not open billing portal. Please try again.');
      }

      if (!data.url) {
        throw new Error('No portal URL returned. Please try again.');
      }

      window.location.href = data.url;
    } catch (err) {
      setPortalError(
        err instanceof Error ? err.message : 'Could not open billing portal. Please try again.'
      );
      setPortalLoading(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingBilling) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading billing information…</p>
      </div>
    );
  }

  if (billingError || !billing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{billingError ?? 'Could not load billing information.'}</span>
        </div>
      </div>
    );
  }

  const usagePercent = Math.min((billing.usageCount / billing.usageLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-slate-900">Billing & Usage</h1>
            <p className="text-lg text-slate-600">
              Manage your subscription and monitor API usage
            </p>
          </div>

          {portalError && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{portalError}</span>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Current plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Current Plan
                </CardTitle>
                <CardDescription>Your active subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-slate-900">
                        {billing.planName}
                      </span>
                      <Badge
                        className={
                          billing.hasActiveSubscription
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {billing.hasActiveSubscription ? 'active' : 'inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {billing.usageLimit.toLocaleString()} requests/month
                    </p>
                  </div>

                  {billing.nextBillingDate && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
                        Next billing: {billing.nextBillingDate}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                {billing.hasActiveSubscription && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                  >
                    {portalLoading ? 'Loading…' : 'Manage Billing'}
                  </Button>
                )}
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpgrade}
                >
                  {billing.hasActiveSubscription ? 'Change Plan' : 'Upgrade'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Usage This Month
                </CardTitle>
                <CardDescription>API request consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-3xl font-bold text-slate-900">
                        {billing.usageCount.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-600">
                        of {billing.usageLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          usagePercent >= 90 ? 'bg-red-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    {usagePercent >= 90 && (
                      <p className="text-xs text-red-600 mt-1">
                        You&apos;re approaching your monthly limit.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Remaining</span>
                      <span className="font-semibold text-slate-900">
                        {(billing.usageLimit - billing.usageCount).toLocaleString()} requests
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-slate-500">
                  Usage resets on the 1st of each month
                </p>
              </CardFooter>
            </Card>
          </div>

          {/* Plan comparison — driven by PLANS so it never drifts from the
              source of truth when limits or names change. */}
          <Card>
            <CardHeader>
              <CardTitle>Need More Requests?</CardTitle>
              <CardDescription>
                Upgrade to a higher plan for increased limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {PLANS.map((plan) => {
                  const active = billing.planName === plan.name;
                  return (
                    <div
                      key={plan.id}
                      className={`p-4 rounded-lg border ${
                        active
                          ? 'border-2 border-blue-500 bg-blue-50'
                          : 'border border-slate-200'
                      }`}
                    >
                      <div
                        className={`font-semibold mb-1 ${
                          active ? 'text-blue-900' : 'text-slate-900'
                        }`}
                      >
                        {plan.name}
                        {active && (
                          <span className="ml-2 text-xs font-normal text-blue-600">
                            current
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-2xl font-bold mb-1 ${
                          active ? 'text-blue-900' : 'text-slate-900'
                        }`}
                      >
                        {plan.requestLimit.toLocaleString()}
                      </div>
                      <div
                        className={`text-sm ${
                          active ? 'text-blue-700' : 'text-slate-600'
                        }`}
                      >
                        requests/month
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800"
                onClick={handleUpgrade}
              >
                View All Plans
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

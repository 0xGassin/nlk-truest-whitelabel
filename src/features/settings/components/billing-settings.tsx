"use client";

import { Check, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PRICING_URL, SUPPORT_MAILTO } from "@/config/brand";
import { billingService } from "@/features/settings";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/auth-store";

function handleUpgrade() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? `${SUPPORT_MAILTO}?subject=Upgrade%20Request`;
  window.open(paymentLink, "_blank");
}

export function BillingSettings() {
  const { user } = useAuthStore();
  const [isLoading] = useState(false);
  const [status, setStatus] = useState<null | string>(null);
  const [plan, setPlan] = useState<null | string>(null);

  const loadStatus = async () => {
    try {
      if (!user?.organization?.id) return;
      const data = await billingService.getSubscriptionStatus(user.organization.id);
      if (data) {
        setStatus(data.status);
        setPlan(data.plan);
      }
    } catch (error) {
      logger.error("Failed to load subscription status", error);
    }
  };

  useEffect(() => {
    if (user?.organization?.id) {
      void loadStatus();
    }
  }, [user?.organization?.id]);

  if (!user?.organization) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Please select or create an organization to manage billing.
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold capitalize">{plan ?? "Community"} Plan</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-background"
            onClick={() => window.open(SUPPORT_MAILTO, "_blank")}
            variant="outline"
          >
            Contact Support
          </Button>
          {status === "active" ? null : (
            <Button className="bg-background" disabled={isLoading} onClick={handleUpgrade} variant="outline">
              {isLoading ? <Spinner className="mr-2 size-4" /> : null}
              View Upgrade Options
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 p-6">
        {/* Upgrade Options Comparison */}
        {status === "active" ? null : (
          <div className="">
            <h4 className="mb-4 font-medium">Available Upgrade Plans</h4>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Basic */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-lg font-semibold">Basic</h5>
                  <p className="text-sm font-medium text-muted-foreground">$29/user/mo</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Up to 20 users
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 25 Repositories
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 3 Cloud Connectors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Daily Scans
                  </li>
                </ul>
              </div>

              {/* Pro */}
              <div className="space-y-4 border-l pl-4 md:border-l-0 md:pl-0 lg:border-l lg:pl-4">
                <div>
                  <h5 className="text-lg font-semibold">Pro</h5>
                  <p className="text-sm font-medium text-muted-foreground">$49/user/mo</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Up to 50 users
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 100 Repositories
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 10 Cloud Connectors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Continuous Scans
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 5 Compliance Frameworks
                  </li>
                </ul>
              </div>

              {/* Business */}
              <div className="space-y-4 border-l pl-4">
                <div>
                  <h5 className="text-lg font-semibold">Business</h5>
                  <p className="text-sm font-medium text-muted-foreground">$89/user/mo</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Up to 50 users
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 200 Repositories
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 20 Cloud Connectors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Real-time Scans
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> All 9 Frameworks
                  </li>
                </ul>
              </div>

              {/* Enterprise */}
              <div className="space-y-4 border-l pl-4 md:border-l-0 md:pl-0 lg:border-l lg:pl-4">
                <div>
                  <h5 className="text-lg font-semibold">Enterprise</h5>
                  <p className="text-sm font-medium text-muted-foreground">Custom pricing</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> 50+ users
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Unlimited Repositories
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Unlimited Connectors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Real-time + SLA
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> Custom CSPM
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-b-xl border-t bg-muted/50 px-6 py-4">
        {/* Hidden until NEXT_PUBLIC_PRICING_URL is set, so the link can never
            point at a page that does not exist. */}
        <div className="text-sm text-muted-foreground">
          {PRICING_URL ? (
            <>
              Learn more about{" "}
              <button
                className="ml-1 inline-flex items-center text-primary hover:underline"
                onClick={() => window.open(PRICING_URL, "_blank")}
              >
                Pricing and Plans <ExternalLink className="ml-1 size-3" />
              </button>
            </>
          ) : null}
        </div>
        <Button disabled={isLoading} onClick={handleUpgrade}>
          {isLoading ? <Spinner className="mr-2 size-4" /> : null}
          Upgrade
        </Button>
      </div>
    </div>
  );
}

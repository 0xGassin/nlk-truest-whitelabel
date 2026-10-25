"use client";

import type { SubscriptionStatus } from "../api/billing";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAssetLimit } from "@/lib/asset-usage";
import { useAuth } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";
import { getDomainMetrics, listDomains } from "@/services/api/domains";
import { getOrganization } from "@/services/api/organization";

import { billingService } from "../api/billing";
import { SettingsSection } from "./settings-section";

const numberFormatter = new Intl.NumberFormat("en-US");
function formatPlanName(value?: string): string {
  if (!value) return "Community";
  return value.replaceAll(/[-_]+/g, " ").replaceAll(/\b\w/g, (character) => character.toUpperCase());
}

export function UsageSettings() {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [assetUsage, setAssetUsage] = useState<null | number>(null);
  const [domainLimit, setDomainLimit] = useState<null | number>(null);
  const [domainLimitKnown, setDomainLimitKnown] = useState(false);
  const [domainUsage, setDomainUsage] = useState<null | number>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<null | string>(null);
  const [subscription, setSubscription] = useState<null | SubscriptionStatus>(null);

  const assetLimit = getAssetLimit(user?.organization?.limits);
  const planName = formatPlanName(subscription?.plan ?? user?.organization?.subscription);
  const assetUsagePercent = assetUsage === null ? 0 : Math.min((assetUsage / assetLimit) * 100, 100);
  const domainAllowance = !domainLimitKnown
    ? "—"
    : domainLimit === null
      ? "Unlimited"
      : numberFormatter.format(domainLimit);
  const domainUsageValue =
    isLoading || domainUsage === null ? "—" : `${numberFormatter.format(domainUsage)} / ${domainAllowance}`;
  const assetUsageValue =
    isLoading || assetUsage === null
      ? "—"
      : `${numberFormatter.format(assetUsage)} / ${numberFormatter.format(assetLimit)}`;

  useEffect(() => {
    let cancelled = false;

    if (!organizationId) {
      return () => {
        cancelled = true;
      };
    }

    const loadUsage = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [nextSubscription, domains, organization] = await Promise.all([
          billingService.getSubscriptionStatus(organizationId).catch(() => null),
          listDomains(organizationId),
          getOrganization(organizationId).catch(() => null),
        ]);
        const metrics = await Promise.all(
          domains
            .filter((domain) => domain.active)
            .map((domain) => getDomainMetrics(organizationId, domain.id, new Date()).catch(() => null)),
        );
        if (cancelled) return;
        setSubscription(nextSubscription ?? null);
        const limit = organization?.limits?.domains;
        setDomainLimit(typeof limit === "number" ? limit : null);
        setDomainLimitKnown(organization?.limits !== undefined && Object.hasOwn(organization.limits, "domains"));
        setDomainUsage(domains.length);
        setAssetUsage(metrics.reduce((total, metric) => total + (metric?.assets ?? 0), 0));
      } catch {
        if (cancelled) return;
        setSubscription(null);
        setAssetUsage(null);
        setDomainLimit(null);
        setDomainLimitKnown(false);
        setDomainUsage(null);
        setLoadError("Could not load current asset usage.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (!organizationId) {
    return (
      <SettingsSection description="View your subscription and organization usage." title="Usage">
        <p className="text-sm text-muted-foreground">Please select or create an organization to view usage.</p>
      </SettingsSection>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-2">
        <h2 className="text-xl font-semibold text-foreground">Usage</h2>
        <p className="mt-2 text-sm text-foreground/80">Review the plan and asset allowance for this organization.</p>
      </div>

      <section className="overflow-hidden rounded-lg border border-border/80 bg-card ring-1 ring-border/10 ring-inset">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 bg-muted/20 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-foreground">Current plan</p>
            <p className="mt-0.5 text-[14px] text-muted-foreground">Organization allowance and consumption</p>
          </div>
          <Badge className="border-border/80 bg-muted px-2 text-[14px] font-medium text-foreground" variant="outline">
            {planName}
          </Badge>
        </div>

        <div className="grid divide-y divide-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-4">
            <p className="text-[14px] font-medium text-foreground">Domains</p>
            <p className="mt-2 text-[14px] font-semibold tabular-nums text-foreground">{domainUsageValue}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">Monitored by this organization</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-[14px] font-medium text-foreground">Assets</p>
            <p className="mt-2 text-[14px] font-semibold tabular-nums text-foreground">{assetUsageValue}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">Tracked across active domains</p>
          </div>
        </div>

        <div className="border-t border-border/70 px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-4 text-[14px]">
            <span className="font-medium text-foreground">Asset allowance</span>
            <span className="tabular-nums text-muted-foreground">
              {isLoading || assetUsage === null
                ? "—"
                : `${numberFormatter.format(Math.round(assetUsagePercent))}% used`}
            </span>
          </div>
          <Progress
            aria-label={`${numberFormatter.format(Math.round(assetUsagePercent))}% of asset limit used`}
            className="bg-blue-100 dark:bg-blue-950/50 [&>[data-slot=progress-indicator]]:bg-blue-600"
            value={assetUsagePercent}
          />
        </div>
        <div className="border-t border-[#eaeaea] bg-[#fafafa] px-4 py-3 text-sm text-muted-foreground dark:border-border dark:bg-card">
          {isLoading ? "Loading usage…" : (loadError ?? "Usage updates as active domains are scanned.")}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Globe2, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DailyValue } from "@/components/dashboardblocks/kpi/area-chart-kpi-02";
import { AlertMessage } from "@/components/ui/alert-message";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { State } from "@/components/state";
import { useAuth } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import { getOrganizationId } from "@/lib/organization";
import { ghostButton } from "@/lib/surfaces";
import {
  listDomainAssets,
  getDomainMetrics,
  listAllDomainFindings,
  listDomainNetworkAssets,
  listDomains,
  listLookalikes,
  type DomainAsset,
} from "@/services/api/domains";
import { listCTFindings } from "@/services/api/ctlog";
import type { CTFinding } from "@/services/api/ctlog";
import type { DomainLookalike, WatchedDomain } from "@/types";
import {
  buildOpenFindingTrend,
  calendarDayOffset,
  countAssetsAtPreviousDay,
  getOpenFindings,
  parseMetricDate,
  startOfLocalDay,
  type OpenFindingTrend,
} from "@/features/findings/lib/finding-metrics";

import type { MappedLookalike } from "./asset-map";
import { DashboardStats, type DashboardStatsData } from "./dashboard-stats";
import { DashboardSkeleton } from "./dashboard-skeleton";
const ASSET_TREND_DAYS = 7;
// Keep the current local-day point fresh while the dashboard is visible. The
// request key below also prevents an intermediary/browser cache from serving
// the previous snapshot during this live refresh.
const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;

function localDayKey(value = new Date()): string {
  return `${String(value.getFullYear())}-${String(value.getMonth())}-${String(value.getDate())}`;
}

function buildAssetTrend(
  assets: DomainAsset[],
  findingTrend: OpenFindingTrend,
  now: Date,
): {
  data: DailyValue[];
  previous: number;
  previousDayAssets: number;
  previousDayFindings: number;
} {
  const today = startOfLocalDay(now);
  const start = new Date(today);
  start.setDate(start.getDate() - (ASSET_TREND_DAYS - 1));
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const days = Array.from({ length: ASSET_TREND_DAYS }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const dailyCounts = days.map(() => 0);
  const previousDayAssets = countAssetsAtPreviousDay(assets, now);
  const previousPeriodStart = new Date(start);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - ASSET_TREND_DAYS);
  let previous = 0;

  for (const asset of assets) {
    const firstSeen = parseMetricDate(asset.first_seen_at);
    if (Number.isNaN(firstSeen.getTime())) continue;
    const dayIndex = calendarDayOffset(firstSeen, start);
    if (firstSeen >= previousPeriodStart && firstSeen < start) {
      previous += 1;
      continue;
    }
    if (dayIndex >= 0 && dayIndex < dailyCounts.length) dailyCounts[dayIndex] += 1;
  }

  return {
    data: days.map((day, index) => ({
      findings: findingTrend.cumulativeCounts[index],
      label: formatter.format(day),
      value: dailyCounts[index],
    })),
    previous,
    previousDayAssets,
    previousDayFindings: findingTrend.previousDayOpenCount,
  };
}

function emptyDashboardStats(): DashboardStatsData {
  return {
    assets: 0,
    assetTrend: [],
    previousAssetTrend: 0,
    previousDayAssets: 0,
    previousDayFindings: 0,
    findings: 0,
    hosts: 0,
    lookalikes: 0,
    services: 0,
    ctLogTrend: [],
    severity: { critical: 0, high: 0, info: 0, low: 0, medium: 0 },
  };
}

function buildCTLogTrend(findings: CTFinding[], now: Date): Array<{ label: string; value: number }> {
  const start = startOfLocalDay(now);
  // Keep today as the final point: this is an incoming-log chart, so its
  // current-day count must be able to grow while the dashboard is open.
  start.setDate(start.getDate() - (ASSET_TREND_DAYS - 1));
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const counts = days.map(() => 0);
  findings.forEach((finding) => {
    // A certificate can have been issued long before it matches a newly added
    // domain. Use its newest CT observation—the time it arrived in the
    // product—rather than the certificate's original first-seen date.
    const observedAt = (finding.observations ?? []).reduce<Date | null>((latest, observation) => {
      const timestamp = parseMetricDate(observation.observed_at);
      if (Number.isNaN(timestamp.getTime()) || (latest !== null && timestamp <= latest)) return latest;
      return timestamp;
    }, null);
    const timestamp = observedAt ?? parseMetricDate(finding.certificate?.first_seen_at);
    if (Number.isNaN(timestamp.getTime())) return;
    const dayIndex = calendarDayOffset(timestamp, start);
    if (dayIndex >= 0 && dayIndex < counts.length) counts[dayIndex] += 1;
  });
  return days.map((day, index) => ({ label: formatter.format(day), value: counts[index] }));
}

export function DashboardContent() {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user) ?? "";
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lookalikesOnly, setLookalikesOnly] = useState(false);
  const [domains, setDomains] = useState<WatchedDomain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [lookalikes, setLookalikes] = useState<MappedLookalike[]>([]);
  const [stats, setStats] = useState<DashboardStatsData>(emptyDashboardStats);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [currentLocalDay, setCurrentLocalDay] = useState(() => localDayKey());
  const [refreshToken, setRefreshToken] = useState(0);
  const lookalikesRef = useRef<MappedLookalike[]>([]);
  const lastLoadedDomainIdRef = useRef<string | null>(null);
  const toggleFilters = useCallback(() => {
    setIsFilterOpen((open) => !open);
  }, []);
  useEffect(() => {
    let timeout: number | null = null;
    const scheduleNextDay = () => {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setHours(24, 0, 0, 0);
      timeout = window.setTimeout(
        () => {
          setCurrentLocalDay(localDayKey());
          scheduleNextDay();
        },
        Math.max(1000, nextDay.getTime() - now.getTime() + 50),
      );
    };

    scheduleNextDay();
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setRefreshToken((token) => token + 1);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setDomains([]);
    setSelectedDomainId("");
    setLookalikes([]);
    setStats(emptyDashboardStats());
    setStatsError(null);
    lookalikesRef.current = [];
    lastLoadedDomainIdRef.current = null;
    if (!organizationId)
      return () => {
        cancelled = true;
      };

    void listDomains(organizationId)
      .then((nextDomains) => {
        if (cancelled) return;
        const verifiedDomains = nextDomains.filter((domain) => domain.active);
        setDomains(verifiedDomains);
        setSelectedDomainId((current) =>
          verifiedDomains.some((domain) => domain.id === current) ? current : (verifiedDomains[0]?.id ?? ""),
        );
        if (verifiedDomains.length === 0) setIsLoading(false);
        return Promise.all(
          verifiedDomains.map(async (domain) => {
            const nextLookalikes = await listLookalikes(organizationId, domain.id);
            return nextLookalikes.map((lookalike: DomainLookalike) => ({ ...lookalike, domainId: domain.id }));
          }),
        );
      })
      .then((nextLookalikes) => {
        if (!cancelled && nextLookalikes) setLookalikes(nextLookalikes.flat());
      })
      .catch(() => {
        if (!cancelled) {
          setLookalikes([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    lookalikesRef.current = lookalikes;
    if (!selectedDomainId) return;

    setStats((current) => ({
      ...current,
      lookalikes: lookalikes.filter(
        (lookalike) => lookalike.domainId === selectedDomainId && lookalike.status === "open",
      ).length,
    }));
  }, [lookalikes, selectedDomainId]);

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) {
      setStats(emptyDashboardStats());
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }
    if (!selectedDomainId) {
      return () => {
        cancelled = true;
      };
    }
    const isDomainSwitch = lastLoadedDomainIdRef.current !== selectedDomainId;
    if (isDomainSwitch) {
      setIsLoading(true);
      setStatsError(null);
    }

    const liveRequestKey = Date.now();
    void Promise.all([
      listDomainAssets(organizationId, selectedDomainId, { includeRemoved: true, cacheBust: liveRequestKey }),
      listAllDomainFindings(organizationId, selectedDomainId, { cacheBust: liveRequestKey }),
      getDomainMetrics(organizationId, selectedDomainId, startOfLocalDay(new Date()), liveRequestKey),
      listDomainNetworkAssets(organizationId, selectedDomainId).catch(() => []),
      listCTFindings(organizationId, selectedDomainId, liveRequestKey).catch(() => []),
    ])
      .then(([assets, findingsResponse, domainMetrics, networkAssets, ctFindings]) => {
        if (cancelled) return;
        const openFindings = getOpenFindings(findingsResponse.findings);
        const activeLookalikes = lookalikesRef.current.filter(
          (lookalike) => lookalike.domainId === selectedDomainId && lookalike.status === "open",
        ).length;
        const severity = { critical: 0, high: 0, info: 0, low: 0, medium: 0 };
        openFindings.forEach((finding) => {
          const key = String(finding.severity ?? "").toLowerCase();
          if (key in severity) severity[key as keyof typeof severity] += 1;
        });
        const now = new Date();
        const findingTrend = buildOpenFindingTrend(findingsResponse.findings, { days: ASSET_TREND_DAYS, now });
        const activeAssets = assets.filter((asset) => !asset.removed_at);
        const assetTrend = buildAssetTrend(assets, findingTrend, now);
        setStats({
          assetTrend: assetTrend.data,
          previousAssetTrend: assetTrend.previous,
          previousDayAssets: domainMetrics.previous_assets,
          previousDayFindings: domainMetrics.previous_findings,
          assets: domainMetrics.assets,
          findings: domainMetrics.findings,
          hosts: activeAssets.filter((asset) => asset.type === "host").length,
          lookalikes: activeLookalikes,
          services: networkAssets.filter((asset) => asset.type === "service").length,
          ctLogTrend: buildCTLogTrend(ctFindings, now),
          severity,
        });
        setStatsError(null);
        lastLoadedDomainIdRef.current = selectedDomainId;
        setIsLoading(false);
      })
      .catch((error) => {
        if (!cancelled) {
          if (isDomainSwitch) setStats(emptyDashboardStats());
          setStatsError(parseApiError(error).message);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentLocalDay, organizationId, refreshToken, selectedDomainId]);

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      return;
    }
    const timeout = window.setTimeout(() => setShowSkeleton(false), 450);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  const selectedDomain = domains.find((domain) => domain.id === selectedDomainId);

  return (
    <div className="relative size-full min-h-0 min-w-0 overflow-hidden">
      <div
        className={`relative size-full transition-opacity duration-500 ease-out ${isLoading ? "opacity-0" : "opacity-100"}`}
      >
        <div className="relative flex size-full min-h-0 min-w-0 flex-col gap-4 overflow-auto bg-background px-2 py-4 font-sans text-[14px]">
          {domains.length === 0 ? (
            <State.Empty
              action={
                <Button asChild variant="outline">
                  <Link href="/assets/domains">Add a domain</Link>
                </Button>
              }
              className="min-h-full"
              description="Add and verify a domain to start discovering assets, findings, and services."
              icon={Globe2}
              title="No verified domains"
            />
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-end gap-2">
                <Select onValueChange={setSelectedDomainId} value={selectedDomainId}>
                  <SelectTrigger
                    aria-label="Select domain for asset map"
                    className="h-8 w-[min(260px,55vw)] border-border bg-card text-[14px] shadow-none dark:bg-card"
                  >
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    avoidCollisions={false}
                    className="border-border"
                    position="popper"
                    side="bottom"
                  >
                    {domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.root_domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  aria-label="Open dashboard filters"
                  aria-pressed={isFilterOpen}
                  className="hidden size-9 bg-card text-foreground shadow-none hover:bg-accent dark:bg-card"
                  onClick={toggleFilters}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
              </div>
              <DashboardStats data={stats} domainName={selectedDomain?.root_domain} />
              {statsError ? (
                <AlertMessage
                  className="shrink-0"
                  message={`Could not refresh ${selectedDomain?.root_domain ?? "this domain"}: ${statsError}`}
                />
              ) : null}
              {isFilterOpen ? (
                <div
                  aria-label="Dashboard filters"
                  className="animate-in fade-in slide-in-from-top-4 zoom-in-95 absolute top-14 right-3 bottom-3 z-50 flex w-[min(640px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[14px] border border-border bg-transparent duration-300 ring-0"
                  role="dialog"
                >
                  <div className="flex flex-col gap-4 p-5">
                    <div>
                      <h2 className="text-label-14">Map filters</h2>
                      <p className="mt-1 text-copy-14 text-muted-foreground">
                        Choose which asset pins appear on the map.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-transparent px-3 py-2.5 text-[14px]">
                      <span>
                        <span className="text-label-14 block">Lookalike hosts only</span>
                        <span className="text-copy-14 block text-muted-foreground">
                          Show only hosts linked to lookalike websites.
                        </span>
                      </span>
                      <Switch
                        aria-label="Show lookalike hosts only"
                        checked={lookalikesOnly}
                        onCheckedChange={(checked) => {
                          setLookalikesOnly(checked);
                        }}
                      />
                    </div>
                  </div>
                  <button
                    aria-label="Close dashboard filters"
                    className={`${ghostButton} absolute top-3 right-3 z-10 size-7`}
                    onClick={() => setIsFilterOpen(false)}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      {showSkeleton ? (
        <div
          className={`absolute inset-0 z-20 transition-opacity duration-500 ease-out ${isLoading ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <DashboardSkeleton />
        </div>
      ) : null}
    </div>
  );
}

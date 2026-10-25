"use client";

import type {
  DomainLookalike,
  DomainVerification,
  OrganizationLimits,
  OrganizationManualRescanUsage,
  WatchedDomain,
} from "@/types";
import type { DomainScanJob } from "@/services/api/domains";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import type { ColumnDef } from "@/components/ui/data-table";

import { Clipboard, ListFilter, MoreHorizontal, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import {
  DataTable,
  DataTableRefreshButton,
  dataTableToolbarButtonClassName,
  dataTableToolbarInputClassName,
} from "@/components/ui/data-table";
import { dialogPrimaryButtonClassName, fieldLabelClassName } from "@/components/ui/dialog-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Filters } from "@/components/ui/filters";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { toast } from "@/components/ui/toast/toast";
import { IntegrationDialogShell } from "@/features/integrations/components/integration-dialog-shell";
import {
  IntegrationStepBody,
  IntegrationStepActionRow,
  IntegrationStepFields,
  IntegrationStepIntro,
} from "@/features/integrations/components/integration-step-content";
import { IntegrationStepper } from "@/features/integrations/components/integration-stepper";
import { useAuth } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { getOrganizationId } from "@/lib/organization";
import {
  addDomain,
  deleteDomain,
  generateDomainExposureReport,
  listLookalikes,
  listDomains,
  listDomainScans,
  listSubdomains,
  rescanDomain,
  rotateVerificationToken,
  verifyDomain,
} from "@/services/api/domains";
import { organizationService } from "@/services/api";

interface VerificationState {
  domain: WatchedDomain;
  verification: DomainVerification;
}

function replaceDomain(domains: WatchedDomain[], updatedDomain: WatchedDomain): WatchedDomain[] {
  return domains.map((domain) => (domain.id === updatedDomain.id ? updatedDomain : domain));
}

function errorMessage(error: unknown): string {
  const apiError = parseApiError(error);
  return typeof apiError.error === "string" ? apiError.error : apiError.message;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCountdown(value: string | undefined, now: number, isRunning = false): string {
  if (!value) return "—";
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return "—";

  const difference = target - now;
  const totalSeconds = Math.ceil(Math.abs(difference) / 1000);
  if (totalSeconds === 0) return isRunning ? "0s running" : "now";

  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  const includeSeconds = totalSeconds < 60 * 60;
  const parts = [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    includeSeconds && seconds ? `${seconds}s` : null,
  ].filter((part): part is string => part !== null);
  const duration = parts.join(" ");

  return difference > 0 ? duration : `${duration} ${isRunning ? "running" : "overdue"}`;
}

function formatScanModule(value?: string): string {
  const normalized = typeof value === "string" ? value : "";
  const labels: Record<string, string> = {
    breachcreds: "Breaches",
    ctlog: "Certificate Monitoring",
    dns: "DNS Discovery",
    geoip: "Location Enrichment",
    lookalike: "Lookalike Monitoring",
    nmap: "Network Service Discovery",
    secheader: "Headers",
    secheaders: "Headers",
    shodan: "Internet Exposure Discovery",
    subfinder: "Subdomain Discovery",
    theharvester: "Public Data Discovery",
    tlsscan: "TLS",
    web: "Directory Discovery",
    webcrawl: "Directory Discovery",
    webtech: "Technology Detection",
    vulnmatch: "Vulnerabilities",
    whois: "Domain Registration Intelligence",
  };
  return (
    labels[normalized] ??
    (normalized
      ? normalized
          .replaceAll("_", " ")
          .replaceAll("-", " ")
          .replace(/\b\w/g, (character) => character.toUpperCase())
      : "Unknown module")
  );
}

function formatScanStatus(value?: string): string {
  const normalized = typeof value === "string" ? value : "";
  if (normalized === "failed") return "Partial";
  return normalized
    ? normalized.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())
    : "Unknown status";
}

function formatPlanName(value?: string): string {
  if (!value) return "current";
  return value.replaceAll(/[-_]+/g, " ").replaceAll(/\b\w/g, (character) => character.toUpperCase());
}

function domainLimitFrom(limits?: OrganizationLimits): number | null {
  return typeof limits?.domains === "number" ? limits.domains : null;
}

const ACTIVE_SCAN_MODULES = new Set(["nmap", "secheaders", "tlsscan", "web", "webtech"]);

type ScanDisplayStatus = "completed" | "failed" | "pending" | "queued" | "requires_active_scanning" | "running";

function getScanDisplayStatus(job: DomainScanJob, activeScanEnabled = true): ScanDisplayStatus {
  if (!activeScanEnabled && ACTIVE_SCAN_MODULES.has(job.module)) return "requires_active_scanning";
  if (job.status === "running") return "running";
  if (job.last_error) return "failed";

  const nextRunAt = new Date(job.next_run_at).getTime();
  if (Number.isFinite(nextRunAt) && nextRunAt <= Date.now()) return "queued";
  if (job.last_run_at) return "completed";
  return "pending";
}

function lookalikeName(title: string): string {
  return (
    title
      .replace(/^Lookalike domain\s+/i, "")
      .replace(/\s+is registered$/i, "")
      .trim() || title
  );
}

function scanStatusChipClass(status: ScanDisplayStatus): string {
  return status === "running"
    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
    : status === "failed"
      ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
      : status === "completed"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : status === "queued"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "bg-muted text-muted-foreground";
}

function formatScanDisplayStatus(status: ScanDisplayStatus): string {
  return status === "requires_active_scanning" ? "Requires Active Scanning" : formatScanStatus(status);
}

function ScanStatusRows({
  activeScanEnabled,
  jobs,
  loading,
  now,
}: {
  activeScanEnabled: boolean;
  jobs: DomainScanJob[];
  loading: boolean;
  now: number;
}) {
  if (loading) {
    return (
      <div className="px-1 py-1">
        {["w-28", "w-36", "w-24", "w-32"].map((width) => (
          <div
            className="-mx-1 grid min-h-[48px] grid-cols-4 items-center border-b border-border/70 px-1 last:border-b-0"
            key={width}
          >
            <div className="min-w-0 px-3 py-1.5">
              <span className={`block h-3 ${width} skeleton-loading rounded`} />
            </div>
            <div className="min-w-0 px-3 py-1.5">
              <div className="grid gap-1">
                <span className="block h-2.5 w-16 skeleton-loading rounded" />
                <span className="block h-3 w-24 skeleton-loading rounded" />
              </div>
            </div>
            <div className="min-w-0 px-3 py-1.5">
              <div className="grid gap-1">
                <span className="block h-2.5 w-16 skeleton-loading rounded" />
                <span className="block h-3 w-24 skeleton-loading rounded" />
              </div>
            </div>
            <div className="flex min-w-0 self-stretch items-center border-l border-foreground/[0.06] py-1.5 pl-3 pr-0">
              <span className="block h-4 w-14 skeleton-loading rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) return <p className="px-1 py-1 text-[13px] text-muted-foreground">No scan jobs found.</p>;

  return jobs.map((job) => {
    const displayStatus = getScanDisplayStatus(job, activeScanEnabled);
    return (
      <div
        className="-ml-1 mr-0 grid min-h-[48px] grid-cols-4 items-center border-b border-border/70 px-1 font-sans text-[14px] font-normal last:border-b-0"
        key={job.module}
      >
        <div className="min-w-0 px-3 py-1.5">
          <p className="min-w-0 break-words font-normal leading-5 text-foreground" title={job.last_error || undefined}>
            {formatScanModule(job.module)}
          </p>
          {job.last_error ? (
            <span className="sr-only" title={job.last_error}>
              {job.last_error}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 px-3 py-1.5 text-[14px] leading-5">
          <p className="font-normal text-muted-foreground">Last run at</p>
          <p className="break-words font-normal text-foreground/80">{formatDate(job.last_run_at)}</p>
        </div>
        <div className="min-w-0 px-3 py-1.5 text-[14px] leading-5">
          <p className="font-normal text-muted-foreground">Next scan in:</p>
          <p className="break-words font-normal text-foreground/80">
            {formatCountdown(job.next_run_at, now, displayStatus === "running")}
          </p>
        </div>
        <div className="flex min-w-0 self-stretch items-center border-l border-foreground/[0.06] py-1.5 pl-3 pr-0">
          <span
            className={cn(
              "inline-flex rounded px-1.5 py-0.5 text-[14px] font-normal",
              scanStatusChipClass(displayStatus),
            )}
          >
            {formatScanDisplayStatus(displayStatus)}
          </span>
        </div>
      </div>
    );
  });
}

function DomainListPreview({ items }: { items: string[] }) {
  const visibleItems = items.slice(0, 2);
  const remainingCount = items.length - visibleItems.length;

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      <Badge className="shrink-0 border-border/80 bg-muted text-foreground" variant="outline">
        {items.length} Total
      </Badge>
      <span className="truncate text-[14px] font-normal text-muted-foreground">
        {visibleItems.join(", ")}
        {remainingCount > 0 ? ` +${remainingCount} more` : ""}
      </span>
    </div>
  );
}

function ScanStatusPreview({ domain, organizationId }: { domain: WatchedDomain; organizationId: string }) {
  const [jobs, setJobs] = useState<DomainScanJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        setJobs(await listDomainScans(organizationId, domain.id));
      } catch {
        setJobs([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [domain.id, organizationId],
  );

  useEffect(() => {
    void load(true);
    const interval = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open]);

  const active = jobs.some((job) => {
    const status = getScanDisplayStatus(job, domain.active_scan_enabled);
    return status === "running" || status === "queued";
  });
  const statuses = jobs.map((job) => getScanDisplayStatus(job, domain.active_scan_enabled));
  const summaryStatus = loading
    ? "pending"
    : jobs.length === 0
      ? "pending"
      : statuses.some((status) => status === "failed")
        ? "failed"
        : statuses.every((status) => status === "queued")
          ? "queued"
          : statuses.every((status) => status === "requires_active_scanning")
            ? "requires_active_scanning"
            : active
              ? "running"
              : "completed";
  const summaryLabel = summaryStatus === "queued" ? "Queued" : formatScanDisplayStatus(summaryStatus);
  const dotClass =
    loading || summaryStatus === "pending"
      ? "bg-muted-foreground"
      : summaryStatus === "running"
        ? "bg-blue-600"
        : summaryStatus === "failed"
          ? "bg-[#ff7a00]"
          : summaryStatus === "queued"
            ? "bg-amber-600"
            : summaryStatus === "requires_active_scanning"
              ? "bg-muted-foreground"
              : "bg-emerald-600";

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150}>
      <HoverCardTrigger asChild>
        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-0.5 text-[14px] font-normal text-foreground">
          <span className={cn("size-1.5 rounded-full", dotClass)} />
          {loading ? "Scan status" : summaryLabel}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        alignOffset={16}
        avoidCollisions
        collisionPadding={16}
        className="box-border max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[52rem] overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-white p-1 pr-0 font-sans text-[14px] text-foreground shadow-xl shadow-black/15 ring-1 ring-border/60 ring-inset [&>svg]:hidden dark:bg-card dark:text-foreground"
        side="left"
      >
        <div>
          <ScanStatusRows activeScanEnabled={domain.active_scan_enabled} jobs={jobs} loading={loading} now={now} />
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function DomainsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [domains, setDomains] = useState<WatchedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subdomainsByDomainId, setSubdomainsByDomainId] = useState<Record<string, string[]>>({});
  const [lookalikesByDomainId, setLookalikesByDomainId] = useState<Record<string, DomainLookalike[]>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addError, setAddError] = useState<null | string>(null);
  const [busyDomainIds, setBusyDomainIds] = useState<Set<string>>(() => new Set());
  const [verificationState, setVerificationState] = useState<null | VerificationState>(null);
  const [domainToDelete, setDomainToDelete] = useState<null | WatchedDomain>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [manualRescanUsage, setManualRescanUsage] = useState<OrganizationManualRescanUsage | null>(
    () => user?.organization?.manual_rescans ?? null,
  );
  const [domainLimit, setDomainLimit] = useState<number | null>(() => domainLimitFrom(user?.organization?.limits));
  const [isManualRescanUsageLoading, setIsManualRescanUsageLoading] = useState(false);
  const [reportingDomainId, setReportingDomainId] = useState<string | null>(null);
  const domainsRequestReference = useRef(0);

  const loadManualRescanUsage = useCallback(async () => {
    if (!organizationId) {
      setManualRescanUsage(null);
      return;
    }

    setIsManualRescanUsageLoading(true);
    try {
      const organization = await organizationService.getOrganization(organizationId);
      setManualRescanUsage(organization.manual_rescans ?? null);
      setDomainLimit(domainLimitFrom(organization.limits));
    } catch {
      // Keep the last known value when usage cannot be refreshed.
    } finally {
      setIsManualRescanUsageLoading(false);
    }
  }, [organizationId]);

  const loadDomains = useCallback(async () => {
    const requestId = ++domainsRequestReference.current;
    if (!organizationId) {
      if (requestId !== domainsRequestReference.current) return;
      setDomains([]);
      setSubdomainsByDomainId({});
      setLookalikesByDomainId({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setSubdomainsByDomainId({});
    setLookalikesByDomainId({});
    try {
      const nextDomains = await listDomains(organizationId);
      if (requestId !== domainsRequestReference.current) return;
      setDomains(nextDomains);

      const [subdomainEntries, lookalikeEntries] = await Promise.all([
        Promise.all(
          nextDomains.map(async (domain) => {
            try {
              return [domain.id, await listSubdomains(organizationId, domain.id)] as const;
            } catch {
              return [domain.id, []] as const;
            }
          }),
        ),
        Promise.all(
          nextDomains.map(async (domain) => {
            try {
              return [domain.id, await listLookalikes(organizationId, domain.id)] as const;
            } catch {
              return [domain.id, []] as const;
            }
          }),
        ),
      ]);
      if (requestId !== domainsRequestReference.current) return;
      setSubdomainsByDomainId(Object.fromEntries(subdomainEntries));
      setLookalikesByDomainId(Object.fromEntries(lookalikeEntries));
    } catch (error) {
      if (requestId !== domainsRequestReference.current) return;
      toast.error("Could not load domains", { description: errorMessage(error) });
    } finally {
      if (requestId === domainsRequestReference.current) setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    void loadManualRescanUsage();
  }, [loadManualRescanUsage]);

  const setDomainBusy = (domainId: string, isBusy: boolean) => {
    setBusyDomainIds((current) => {
      const next = new Set(current);
      if (isBusy) {
        next.add(domainId);
      } else {
        next.delete(domainId);
      }
      return next;
    });
  };

  const handleAddDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rootDomain = newDomain.trim();
    if (!rootDomain) {
      setAddError("Enter the root domain you want to verify.");
      return;
    }

    setIsAdding(true);
    setAddError(null);
    if (!organizationId) {
      setAddError("No organization is selected.");
      setIsAdding(false);
      return;
    }
    try {
      const result = await addDomain(organizationId, rootDomain);
      setDomains((current) => [result.domain, ...current]);
      setVerificationState(result);
      setCurrentStep(2);
      toast.success("Domain added", { description: "Publish the TXT record to continue verification." });
    } catch (error) {
      const apiError = parseApiError(error);
      if (apiError.code === "plan_domain_limit") {
        const planName = formatPlanName(user?.organization?.subscription);
        const currentCount = domainLimit === null ? domains.length : Math.max(domains.length, domainLimit);
        const description =
          domainLimit === null
            ? `Your ${planName} plan has reached its domain limit. Remove an existing domain or upgrade your plan to add another.`
            : `Your ${planName} plan includes up to ${domainLimit} domain${domainLimit === 1 ? "" : "s"}. You are currently tracking ${currentCount} of ${domainLimit}. Remove an existing domain or upgrade your plan to add another.`;
        setAddError("Plan domain limit reached.");
        toast.error("Plan domain limit reached.", { description });
      } else {
        setAddError(errorMessage(error));
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domain: WatchedDomain) => {
    if (!organizationId) return;
    setDomainBusy(domain.id, true);
    try {
      const updatedDomain = await verifyDomain(organizationId, domain.id);
      setDomains((current) => replaceDomain(current, updatedDomain));
      setIsAddDialogOpen(false);
      setVerificationState(null);
      setCurrentStep(1);
      setNewDomain("");
      toast.success("Domain verified", { description: `${updatedDomain.root_domain} is now being monitored.` });
    } catch (error) {
      toast.error("Verification failed", { description: errorMessage(error) });
    } finally {
      setDomainBusy(domain.id, false);
    }
  };

  const handleRotateRecord = useCallback(
    async (domain: WatchedDomain) => {
      if (!organizationId) return;
      setDomainBusy(domain.id, true);
      try {
        const result = await rotateVerificationToken(organizationId, domain.id);
        setDomains((current) => replaceDomain(current, result.domain));
        setVerificationState(result);
        setCurrentStep(2);
        setIsAddDialogOpen(true);
        toast.success("New TXT record created", { description: "Replace the previous record before verifying." });
      } catch (error) {
        toast.error("Could not create a TXT record", { description: errorMessage(error) });
      } finally {
        setDomainBusy(domain.id, false);
      }
    },
    [organizationId],
  );

  const handleRescan = useCallback(
    async (domain: WatchedDomain) => {
      if (!organizationId) return;
      setDomainBusy(domain.id, true);
      try {
        const result = await rescanDomain(organizationId, domain.id);
        setManualRescanUsage(result.manual_rescans);
        const queued = result.queued;
        if (queued > 0) {
          toast.success("Rescan started", {
            description: `${String(queued)} scan job${queued === 1 ? "" : "s"} queued for ${domain.root_domain}.`,
          });
        } else {
          toast.info("Rescan already in progress", {
            description: `No pending scan jobs were available to restart for ${domain.root_domain}.`,
          });
        }
      } catch (error) {
        const apiError = parseApiError(error);
        if (apiError.code === "plan_rescan_limit") {
          setManualRescanUsage((current) =>
            current?.limit === null || current === null
              ? current
              : { ...current, used: Math.max(current.used, current.limit) },
          );
          const planName = formatPlanName(user?.organization?.subscription);
          const limit = manualRescanUsage?.limit;
          const used = manualRescanUsage?.used;
          const description =
            typeof limit === "number" && typeof used === "number"
              ? `You have 0 manual rescans left. Your ${planName} plan allows ${limit} manual rescan${limit === 1 ? "" : "s"} in a rolling 30-day window, and you have used ${Math.max(used, limit)} of ${limit}. Your allowance refreshes next month as rescans leave the rolling window.`
              : `You have 0 manual rescans left. Your ${planName} plan's manual rescan allowance is exhausted. Your allowance refreshes next month as rescans leave the rolling 30-day window.`;
          toast.error("Manual rescan limit reached", { description });
        } else {
          toast.error("Could not start rescan", { description: errorMessage(error) });
        }
      } finally {
        setDomainBusy(domain.id, false);
      }
    },
    [manualRescanUsage, organizationId, user?.organization?.subscription],
  );

  const handleGenerateReport = useCallback(
    async (domain: WatchedDomain) => {
      if (!organizationId || reportingDomainId) return;

      setReportingDomainId(domain.id);
      const loadingToastId = toast.loading("Generating report", {
        description: `Preparing ${domain.root_domain} exposure report...`,
        persist: true,
      });
      try {
        const report = await generateDomainExposureReport(organizationId, domain.id);
        const reportUrl = globalThis.URL.createObjectURL(report);
        const link = document.createElement("a");
        link.href = reportUrl;
        link.download = `exposure_report_${domain.root_domain.replaceAll(/[^a-z0-9]+/gi, "_")}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        globalThis.URL.revokeObjectURL(reportUrl);
        toast.success("Report generated", { description: `${domain.root_domain} exposure report downloaded.` });
      } catch (error) {
        toast.error("Could not generate report", { description: errorMessage(error) });
      } finally {
        toast.dismiss(loadingToastId);
        setReportingDomainId(null);
      }
    },
    [organizationId, reportingDomainId],
  );

  const manualRescansRemaining =
    manualRescanUsage?.limit === null
      ? "Unlimited"
      : manualRescanUsage
        ? String(Math.max(manualRescanUsage.limit - manualRescanUsage.used, 0))
        : null;
  const manualRescanLimitReached = manualRescanUsage?.limit !== null && manualRescansRemaining === "0";

  const handleDelete = async () => {
    if (!domainToDelete) return;
    if (!organizationId) return;

    setIsDeleting(true);
    try {
      await deleteDomain(organizationId, domainToDelete.id);
      setDomains((current) => current.filter((domain) => domain.id !== domainToDelete.id));
      toast.success("Domain removed", { description: `${domainToDelete.root_domain} is no longer monitored.` });
      setDomainToDelete(null);
    } catch (error) {
      toast.error("Could not remove domain", { description: errorMessage(error) });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy value", { description: "Select and copy the value manually." });
    }
  };

  const openDomainWizard = () => {
    setAddError(null);
    setCurrentStep(1);
    setNewDomain("");
    setVerificationState(null);
    setIsAddDialogOpen(true);
  };

  const statusField = useMemo<FilterFieldConfig>(
    () => ({
      key: "status",
      label: "Status",
      operators: [
        { label: "is", value: "is" },
        { label: "is not", value: "is_not" },
      ],
      options: [
        { label: "Verified", value: "verified" },
        { label: "Awaiting verification", value: "awaiting" },
      ],
      type: "select",
    }),
    [],
  );

  const filteredDomains = useMemo(
    () =>
      domains.filter((domain) =>
        filters.every((filter) => {
          if (filter.field !== "status") return true;
          const status = domain.active ? "verified" : "awaiting";
          const value = typeof filter.values[0] === "string" ? filter.values[0] : "";
          if (filter.operator === "is_not") return status !== value;
          return status === value;
        }),
      ),
    [domains, filters],
  );

  const renderDomainContextMenu = useCallback(
    (domain: WatchedDomain) => {
      const isBusy = busyDomainIds.has(domain.id);
      const isGeneratingReport = reportingDomainId === domain.id;
      return (
        <>
          <ContextMenuItem
            disabled={isBusy || reportingDomainId !== null}
            onSelect={() => {
              void handleGenerateReport(domain);
            }}
          >
            Generate Report
            {isGeneratingReport ? <span className="ml-auto text-[14px] text-muted-foreground">…</span> : null}
          </ContextMenuItem>
          {domain.active ? (
            <>
              <ContextMenuItem
                disabled={isBusy || manualRescanLimitReached}
                onSelect={() => {
                  void handleRescan(domain);
                }}
              >
                Rescan
                <span className="ml-auto text-[14px] text-muted-foreground">
                  {isManualRescanUsageLoading && !manualRescanUsage
                    ? "…"
                    : manualRescansRemaining === "Unlimited"
                      ? "Unlimited"
                      : manualRescansRemaining === null
                        ? "—"
                        : `${manualRescansRemaining} left`}
                </span>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          {!domain.active ? (
            <>
              <ContextMenuItem
                disabled={isBusy}
                onSelect={() => {
                  void handleRotateRecord(domain);
                }}
              >
                Verify
              </ContextMenuItem>
              <ContextMenuItem
                disabled={isBusy}
                onSelect={() => {
                  void handleRotateRecord(domain);
                }}
              >
                Generate New TXT Record
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          <ContextMenuItem
            disabled={isBusy}
            onSelect={() => {
              setDomainToDelete(domain);
            }}
            variant="destructive"
          >
            Delete
          </ContextMenuItem>
        </>
      );
    },
    [
      busyDomainIds,
      handleGenerateReport,
      handleRescan,
      handleRotateRecord,
      isManualRescanUsageLoading,
      manualRescanLimitReached,
      manualRescanUsage,
      manualRescansRemaining,
      reportingDomainId,
    ],
  );

  const columns = useMemo<ColumnDef<WatchedDomain>[]>(
    () => [
      {
        cell: (domain) => <span className="text-[14px] font-normal">{domain.root_domain}</span>,
        header: "Domain",
        id: "root_domain",
        sortable: true,
        sortValue: (domain) => domain.root_domain,
        width: "1fr",
      },
      {
        cell: (domain) => {
          const subdomains = subdomainsByDomainId[domain.id] ?? [];
          return subdomains.length > 0 ? (
            <DomainListPreview items={subdomains} />
          ) : (
            <span className="text-[14px] font-normal text-muted-foreground">—</span>
          );
        },
        header: "Subdomains",
        id: "subdomains",
        sortable: true,
        sortValue: (domain) => (subdomainsByDomainId[domain.id] ?? []).length,
        width: "1fr",
      },
      {
        cell: (domain) => {
          const lookalikes = lookalikesByDomainId[domain.id] ?? [];
          const names = lookalikes.map((lookalike) => lookalikeName(lookalike.title));

          return lookalikes.length > 0 ? (
            <DomainListPreview items={names} />
          ) : (
            <span className="text-[14px] font-normal text-muted-foreground">—</span>
          );
        },
        header: "Lookalikes",
        id: "lookalikes",
        sortable: true,
        sortValue: (domain) => (lookalikesByDomainId[domain.id] ?? []).length,
        width: "1fr",
      },
      {
        cell: (domain) =>
          domain.active ? (
            <ScanStatusPreview domain={domain} organizationId={organizationId ?? ""} />
          ) : (
            <Badge
              className="border-transparent bg-amber-500/15 text-[14px] font-normal text-amber-700 dark:text-amber-400"
              variant="secondary"
            >
              Awaiting verification
            </Badge>
          ),
        header: "Status",
        id: "status",
        sortable: true,
        sortValue: (domain) => (domain.active ? "verified" : "awaiting"),
        width: "1fr",
      },
      {
        align: "right",
        cell: (domain) => (
          <div className="flex items-center justify-center">
            <Button
              className="size-8 p-0 text-foreground/60 shadow-none hover:bg-[#e2e2e2] hover:text-foreground dark:hover:bg-accent"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                event.currentTarget.dispatchEvent(
                  new MouseEvent("contextmenu", {
                    bubbles: true,
                    button: 2,
                    cancelable: true,
                    clientX: event.clientX,
                    clientY: event.clientY,
                  }),
                );
              }}
              size="sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        ),
        header: "Actions",
        id: "actions",
        sortable: false,
        width: "72px",
      },
    ],
    [lookalikesByDomainId, subdomainsByDomainId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      <DataTable
        actions={
          <div className="flex items-center gap-3">
            <Button
              className="h-9 gap-2 border-0 bg-[#0033ff] text-white shadow-none hover:bg-[#0033ff]/90 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:shadow-none"
              onClick={openDomainWizard}
            >
              <Plus />
              Add domain
            </Button>
            <DataTableRefreshButton
              className={cn(dataTableToolbarButtonClassName, "shadow-none")}
              isLoading={isLoading}
              onClick={() => void loadDomains()}
            />
          </div>
        }
        className="h-full min-h-0"
        columns={columns}
        data={filteredDomains}
        emptyAction={
          domains.length === 0 ? (
            <Button
              className={cn(dataTableToolbarButtonClassName, "gap-2 shadow-none")}
              onClick={openDomainWizard}
              variant="outline"
            >
              <Plus />
              Add domain
            </Button>
          ) : undefined
        }
        emptyMessage={
          domains.length === 0
            ? "Add a root domain, publish its TXT record, and verify ownership to start monitoring."
            : "No domains found matching your filters."
        }
        emptyStateClassName="border-0 bg-transparent"
        emptyTitle={domains.length === 0 ? "" : "No domains found"}
        getRowHref={(domain) => (domain.active ? `/assets/domains/${domain.id}` : undefined)}
        getRowKey={(domain) => domain.id}
        hideToolbarWhenEmpty={domains.length === 0}
        isLoading={isLoading}
        keepToolbarWhileLoading
        loadingMessage="Loading domains"
        onRowClick={(domain) => {
          if (!domain.active) return;
          router.push(`/assets/domains/${domain.id}`);
        }}
        renderContextMenu={renderDomainContextMenu}
        searchKey="root_domain"
        searchPlaceholder="Search Domains"
        showHeaderColumnSeparators={false}
        tableCellClassName="px-4 py-3 align-middle"
        tableClassName="table-fixed w-full"
        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
        tableRowClassName="h-[64px] bg-card text-foreground hover:bg-muted/30"
        rowClassName={(domain) =>
          domain.active ? "" : "!cursor-default bg-muted/40 text-muted-foreground hover:bg-muted/40"
        }
        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
        toolbarButtonClassName={dataTableToolbarButtonClassName}
        toolbarInputClassName={dataTableToolbarInputClassName}
        extraToolbarContent={
          <div className="flex flex-wrap items-center gap-2.5">
            <Filters
              fields={[statusField]}
              filters={filters}
              onChange={setFilters}
              trigger={
                <Button className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")} variant="outline">
                  <ListFilter className="size-4" />
                  Add Filter
                </Button>
              }
            />
            {filters.length > 0 ? (
              <Button
                className={cn(dataTableToolbarButtonClassName, "gap-1.5 shadow-none")}
                onClick={() => setFilters([])}
                variant="outline"
              >
                <ListFilter className="size-4" />
                Clear
              </Button>
            ) : null}
          </div>
        }
      />

      <IntegrationDialogShell
        className="domain-modal-motion border-border ring-1 ring-border/10 ring-inset"
        closeButtonClassName="text-foreground/70 hover:text-foreground"
        footerHint={
          currentStep === 1
            ? "Enter the root domain you want to verify"
            : verificationState
              ? `TXT record expires ${formatDate(verificationState.verification.expires_at)}`
              : undefined
        }
        onOpenChange={(open) => {
          if (open) {
            setIsAddDialogOpen(true);
            return;
          }
          setIsAddDialogOpen(false);
          setVerificationState(null);
          setCurrentStep(1);
          setAddError(null);
        }}
        open={isAddDialogOpen}
        title={currentStep === 1 ? "Add Domain" : "Verify Domain"}
      >
        <IntegrationStepper
          completedSteps={currentStep === 2 ? [1] : []}
          currentStep={currentStep}
          steps={[
            {
              action: (
                <IntegrationStepActionRow
                  primary={
                    <Button
                      className={cn(dialogPrimaryButtonClassName, "shadow-none")}
                      disabled={isAdding}
                      form="add-domain-form"
                      type="submit"
                    >
                      {isAdding ? <Spinner className="mr-2 size-4" /> : null}
                      Add Domain
                    </Button>
                  }
                />
              ),
              content: (
                <form id="add-domain-form" onSubmit={(event) => void handleAddDomain(event)}>
                  <IntegrationStepBody>
                    <IntegrationStepIntro>
                      Add a root domain to monitor certificate activity and exposure. You will receive a DNS TXT record
                      to verify ownership.
                    </IntegrationStepIntro>
                    <IntegrationStepFields>
                      <div className="space-y-2">
                        <Label className={fieldLabelClassName} htmlFor="root-domain">
                          Root domain
                        </Label>
                        <Input
                          autoComplete="off"
                          disabled={isAdding}
                          id="root-domain"
                          onChange={(event) => {
                            setNewDomain(event.target.value);
                            setAddError(null);
                          }}
                          placeholder="example.com"
                          value={newDomain}
                        />
                        {addError ? <p className="text-[13px] text-destructive">{addError}</p> : null}
                      </div>
                    </IntegrationStepFields>
                  </IntegrationStepBody>
                </form>
              ),
              label: "Add Domain",
            },
            {
              action: (
                <IntegrationStepActionRow
                  onBack={() => {
                    setCurrentStep(1);
                  }}
                  primary={
                    verificationState ? (
                      <div className="flex items-center gap-2">
                        <Button
                          disabled={busyDomainIds.has(verificationState.domain.id)}
                          onClick={() => {
                            void handleRotateRecord(verificationState.domain);
                          }}
                          type="button"
                          className="shadow-none"
                          variant="outline"
                        >
                          {busyDomainIds.has(verificationState.domain.id) ? (
                            <Spinner className="mr-2 size-4" />
                          ) : (
                            <RefreshCw className="mr-2 size-4" />
                          )}
                          New record
                        </Button>
                        <Button
                          className={cn(dialogPrimaryButtonClassName, "shadow-none")}
                          disabled={busyDomainIds.has(verificationState.domain.id)}
                          onClick={() => {
                            void handleVerify(verificationState.domain);
                          }}
                          type="button"
                        >
                          {busyDomainIds.has(verificationState.domain.id) ? (
                            <Spinner className="mr-2 size-4" />
                          ) : (
                            <ShieldCheck className="mr-2 size-4" />
                          )}
                          Verify Domain
                        </Button>
                      </div>
                    ) : null
                  }
                />
              ),
              content: verificationState ? (
                <IntegrationStepBody>
                  <IntegrationStepIntro>
                    Publish this TXT record in your DNS provider to verify ownership of{" "}
                    {verificationState.domain.root_domain}. DNS propagation can take a few minutes.
                  </IntegrationStepIntro>
                  <div className="space-y-4 rounded-lg border border-[#eaeaea] p-4 dark:border-border">
                    <VerificationValue label="Record type" value={verificationState.verification.record_type} />
                    <VerificationValue label="Host / name" value={verificationState.verification.record_name} />
                    <VerificationValue
                      label="TXT value"
                      onCopy={() => void copyValue(verificationState.verification.record_value, "TXT value")}
                      value={verificationState.verification.record_value}
                    />
                  </div>
                </IntegrationStepBody>
              ) : null,
              label: "Verify DNS Record",
            },
          ]}
        />
      </IntegrationDialogShell>

      <AlertDialog onOpenChange={(open) => !open && setDomainToDelete(null)} open={domainToDelete !== null}>
        <AlertDialogContent className="border-[1.14px] border-[#eaeaea] bg-[#fdfdfd] shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:border-border dark:bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17.5px] font-semibold tracking-[-0.4px] text-foreground">
              Remove {domainToDelete?.root_domain}?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-[15px] text-[#171717] dark:text-foreground">
              This stops monitoring the domain and removes its verification state. You can add it again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel className="h-8 gap-1.5 px-3 text-sm shadow-none has-[>svg]:px-2.5" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 gap-1.5 bg-red-600 px-3 text-sm text-white shadow-none hover:bg-red-700 has-[>svg]:px-2.5"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? <Spinner /> : <Trash2 />}
              Remove domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VerificationValue({ label, onCopy, value }: { label: string; onCopy?: () => void; value: string }) {
  return (
    <div className="space-y-2">
      <Label className={fieldLabelClassName}>{label}</Label>
      <div className="relative">
        <Input
          className={`${onCopy ? "pr-11" : "pr-3"} !bg-[#f5f5f5] text-[#666666] dark:!bg-muted dark:text-muted-foreground`}
          readOnly
          value={value}
          wrapperClassName="bg-[#f5f5f5] dark:bg-muted"
        />
        {onCopy ? (
          <Button
            aria-label={`Copy ${label}`}
            className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2 text-[#666666] shadow-none hover:bg-[#fafafa] hover:text-foreground dark:text-muted-foreground dark:hover:bg-accent"
            onClick={onCopy}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Clipboard className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

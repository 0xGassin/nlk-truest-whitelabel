"use client";

import { ChevronRight, Network } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ColumnDef } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, dataTableToolbarInputClassName } from "@/components/ui/data-table";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { listDomainNetworkAssets, type DomainNetworkAsset } from "@/services/api/domains";
import { cn } from "@/lib/utils";

function attrString(asset: DomainNetworkAsset, key: string): string {
  const value = asset.attrs?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function attrStrings(asset: DomainNetworkAsset, key: string): string[] {
  const value = asset.attrs?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isMainDomainURL(value: string, domains: Set<string>): boolean {
  const candidate = value.trim();
  if (!candidate) return false;

  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return domains.has(hostname) && url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return domains.has(
      candidate
        .toLowerCase()
        .replace(/^www\./, "")
        .replace(/\/$/, ""),
    );
  }
}

function emailAuth(asset: DomainNetworkAsset | undefined): Record<string, unknown> | null {
  const value = asset?.attrs?.email_auth;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function authText(value: unknown, fallback = "Not found"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function AuthStatus({ present, warning = false }: { present: boolean; warning?: boolean }) {
  return (
    <span
      className={cn(
        "text-[14.5px] font-normal",
        present && !warning
          ? "text-foreground"
          : warning
            ? "text-amber-700 dark:text-amber-400"
            : "text-muted-foreground",
      )}
    >
      {present ? (warning ? "Review" : "Configured") : "Not found"}
    </span>
  );
}

function SmoothPanel({ children, open }: { children: ReactNode; open: boolean }) {
  return (
    <div
      className={cn(
        "grid will-change-[grid-template-rows,opacity] transition-[grid-template-rows,opacity] duration-[250ms] ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function EnrichmentSection({
  children,
  className,
  embedded,
}: {
  children: ReactNode;
  className?: string;
  embedded: boolean;
}) {
  return embedded ? (
    <section className={cn("overflow-hidden border-b border-border last:border-b-0", className)}>{children}</section>
  ) : (
    <Card className={cn("gap-0 overflow-hidden rounded-lg border border-border py-0", className)}>{children}</Card>
  );
}

type EnrichmentRow = { id: string; value: string };

export function DomainNetworkEnrichment({
  className,
  domainId,
  embedded = false,
  organizationId,
}: {
  className?: string;
  domainId: string;
  embedded?: boolean;
  organizationId: string;
}) {
  const [assets, setAssets] = useState<DomainNetworkAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isAsnOpen, setIsAsnOpen] = useState(true);
  const [isEmailOpen, setIsEmailOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(["harvester"]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await listDomainNetworkAssets(organizationId, domainId));
    } catch (error) {
      toast.error("Could not load enrichment", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const asns = useMemo(
    () => [
      ...new Set(assets.flatMap((asset) => [attrString(asset, "asn"), ...attrStrings(asset, "asns")]).filter(Boolean)),
    ],
    [assets],
  );
  const organizations = useMemo(
    () => [...new Set(assets.map((asset) => attrString(asset, "org")).filter(Boolean))],
    [assets],
  );
  const operatingSystems = useMemo(
    () => [...new Set(assets.map((asset) => attrString(asset, "os")).filter(Boolean))],
    [assets],
  );
  const isps = useMemo(() => [...new Set(assets.map((asset) => attrString(asset, "isp")).filter(Boolean))], [assets]);
  const interestingURLs = useMemo(() => {
    const domains = new Set(
      assets
        .filter((asset) => asset.type === "domain")
        .map((asset) =>
          asset.value
            .toLowerCase()
            .replace(/^www\./, "")
            .replace(/\.$/, ""),
        ),
    );
    return [
      ...new Set(
        assets
          .flatMap((asset) => attrStrings(asset, "interesting_urls"))
          .filter((url) => !isMainDomainURL(url, domains)),
      ),
    ];
  }, [assets]);
  const people = useMemo(() => [...new Set(assets.flatMap((asset) => attrStrings(asset, "people")))], [assets]);
  const interestingURLRows = useMemo<EnrichmentRow[]>(
    () => interestingURLs.map((value, index) => ({ id: `url-${index}-${value}`, value })),
    [interestingURLs],
  );
  const peopleRows = useMemo<EnrichmentRow[]>(
    () => people.map((value, index) => ({ id: `person-${index}-${value}`, value })),
    [people],
  );
  const urlColumns = useMemo<ColumnDef<EnrichmentRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.value}>
            {row.value}
          </span>
        ),
        header: "URL",
        id: "value",
        sortable: true,
        sortValue: (row) => row.value,
        width: "1fr",
      },
    ],
    [],
  );
  const peopleColumns = useMemo<ColumnDef<EnrichmentRow>[]>(
    () => [
      {
        cell: (row) => (
          <span className="block truncate text-[14px] font-normal" title={row.value}>
            {row.value}
          </span>
        ),
        header: "Person",
        id: "value",
        sortable: true,
        sortValue: (row) => row.value,
        width: "1fr",
      },
    ],
    [],
  );
  const email = useMemo(() => emailAuth(assets.find((asset) => asset.type === "domain")), [assets]);
  const mx = Array.isArray(email?.mx) ? email.mx.filter((value): value is string => typeof value === "string") : [];
  const spfPresent = email?.spf_present === true;
  const dmarcPresent = email?.dmarc_present === true;
  const dkimPresent = email?.dkim_present === true;
  const toggleSection = (section: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const sections = (
    <>
      <EnrichmentSection className="bg-white dark:bg-card" embedded={embedded}>
        <CardHeader className="!flex items-center justify-between gap-0 border-b px-5 py-4 !pb-4">
          <button
            className="flex items-center gap-2 text-left"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <ChevronRight className={`size-5 text-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <CardTitle className="text-base font-medium leading-6">Enrichment</CardTitle>
          </button>
        </CardHeader>
        <div
          className={cn(
            "grid will-change-[grid-template-rows,opacity] transition-[grid-template-rows,opacity] duration-[250ms] ease-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <CardContent className="bg-white p-0 dark:bg-card">
              <div className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Operating system</p>
                  <p className="mt-1 truncate text-sm font-normal" title={operatingSystems.join(", ")}>
                    {loading ? "Loading…" : operatingSystems.join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ISP</p>
                  <p className="mt-1 truncate text-sm font-normal" title={isps.join(", ")}>
                    {loading ? "Loading…" : isps.join(", ") || "—"}
                  </p>
                </div>
              </div>
              <div className="border-t">
                <section>
                  <button
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm hover:bg-muted/30"
                    onClick={() => toggleSection("harvester")}
                    type="button"
                  >
                    <ChevronRight
                      className={`size-4 text-muted-foreground transition-transform ${expandedSections.has("harvester") ? "rotate-90" : ""}`}
                    />
                    <Network className="size-4 text-muted-foreground" />
                    <span className="font-medium">Enrichment</span>
                    <span className="truncate text-muted-foreground">
                      {interestingURLs.length} URLs · {people.length} people
                    </span>
                    <span className="ml-auto text-muted-foreground">{interestingURLs.length + people.length}</span>
                  </button>
                  <SmoothPanel open={expandedSections.has("harvester")}>
                    <div className="grid gap-4 border-t border-border bg-white p-4 dark:bg-card lg:grid-cols-2">
                      <DataTable
                        className="min-h-0"
                        columns={urlColumns}
                        data={interestingURLRows}
                        defaultPageSize={10}
                        emptyMessage="No interesting URLs found."
                        emptyTitle="No interesting URLs"
                        getRowKey={(row) => row.id}
                        isLoading={loading}
                        searchKey={(row) => row.value}
                        searchPlaceholder="Search URLs"
                        showHeaderColumnSeparators={false}
                        tableCellClassName="border-border/70 px-4 py-2 align-middle"
                        tableClassName="table-fixed w-full"
                        tableContainerClassName="rounded-lg border border-border bg-card"
                        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
                        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
                        tableRowClassName="h-10 w-full bg-card text-foreground font-normal hover:bg-muted/30"
                        toolbarInputClassName={dataTableToolbarInputClassName}
                      />
                      <DataTable
                        className="min-h-0"
                        columns={peopleColumns}
                        data={peopleRows}
                        defaultPageSize={10}
                        emptyMessage="No interesting people found."
                        emptyTitle="No interesting people"
                        getRowKey={(row) => row.id}
                        isLoading={loading}
                        searchKey={(row) => row.value}
                        searchPlaceholder="Search People"
                        showHeaderColumnSeparators={false}
                        tableCellClassName="border-border/70 px-4 py-2 align-middle"
                        tableClassName="table-fixed w-full"
                        tableContainerClassName="rounded-lg border border-border bg-card"
                        tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
                        tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
                        tableRowClassName="h-10 w-full bg-card text-foreground font-normal hover:bg-muted/30"
                        toolbarInputClassName={dataTableToolbarInputClassName}
                      />
                    </div>
                  </SmoothPanel>
                </section>
              </div>
            </CardContent>
          </div>
        </div>
      </EnrichmentSection>
      <EnrichmentSection className="bg-white dark:bg-card" embedded={embedded}>
        <CardHeader className="!flex items-center justify-between gap-0 border-b px-5 py-4 !pb-4">
          <button
            className="flex items-center gap-2 text-left"
            onClick={() => setIsAsnOpen((current) => !current)}
            type="button"
          >
            <ChevronRight className={`size-5 text-foreground transition-transform ${isAsnOpen ? "rotate-90" : ""}`} />
            <CardTitle className="text-base font-medium leading-6">ASN and Organization</CardTitle>
          </button>
          <Badge className="border-border/80 bg-muted px-1.5 text-foreground" variant="outline">
            {asns.length} ASN · {organizations.length} org
          </Badge>
        </CardHeader>
        <div
          className={cn(
            "grid will-change-[grid-template-rows,opacity] transition-[grid-template-rows,opacity] duration-[250ms] ease-out",
            isAsnOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <CardContent className="bg-transparent p-0">
              <div className="grid gap-x-12 gap-y-6 px-5 pb-6 pt-5 text-[14.5px] sm:grid-cols-2">
                <div>
                  <p className="text-[14.5px] text-muted-foreground">ASN</p>
                  <p className="mt-0.5 truncate text-[14.5px] font-normal text-foreground">{asns.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[14.5px] text-muted-foreground">Organization</p>
                  <p className="mt-0.5 truncate text-[14.5px] font-normal text-foreground">
                    {organizations.join(", ") || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </EnrichmentSection>
      <EnrichmentSection className="bg-white dark:bg-card" embedded={embedded}>
        <CardHeader className="!flex items-center justify-between gap-0 border-b px-5 py-4 !pb-4">
          <button
            className="flex items-center gap-2 text-left"
            onClick={() => setIsEmailOpen((current) => !current)}
            type="button"
          >
            <ChevronRight className={`size-5 text-foreground transition-transform ${isEmailOpen ? "rotate-90" : ""}`} />
            <CardTitle className="text-base font-medium">Email Security</CardTitle>
          </button>
        </CardHeader>
        <div
          className={cn(
            "grid will-change-[grid-template-rows,opacity] transition-[grid-template-rows,opacity] duration-[250ms] ease-out",
            isEmailOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <CardContent className="bg-transparent p-0">
              <div className="grid gap-x-12 gap-y-6 px-5 pb-6 pt-5 sm:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-[14.5px] text-muted-foreground">MX</p>
                  <p className="mt-0.5 truncate text-[14.5px] font-normal text-foreground" title={mx.join(", ")}>
                    {loading ? "Loading…" : mx.join(", ") || "No MX records"}
                  </p>
                </div>
                <div>
                  <p className="text-[14.5px] text-muted-foreground">SPF</p>
                  <p className="mt-0.5">
                    <AuthStatus present={spfPresent} warning={spfPresent && email?.spf_policy !== "fail (-all)"} />
                  </p>
                  <p
                    className="mt-0.5 truncate text-[12px] font-normal text-muted-foreground"
                    title={authText(email?.spf, "")}
                  >
                    {authText(email?.spf_policy, "No policy detected")}
                  </p>
                </div>
                <div>
                  <p className="text-[14.5px] text-muted-foreground">DMARC</p>
                  <p className="mt-0.5">
                    <AuthStatus present={dmarcPresent} warning={dmarcPresent && email?.dmarc_policy === "none"} />
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-normal text-muted-foreground">
                    {dmarcPresent ? `p=${authText(email?.dmarc_policy)}` : "No policy detected"}
                  </p>
                </div>
                <div>
                  <p className="text-[14.5px] text-muted-foreground">DKIM</p>
                  <p className="mt-0.5">
                    <AuthStatus present={dkimPresent} warning={!dkimPresent && mx.length > 0} />
                  </p>
                  <p
                    className="mt-0.5 truncate text-[12px] font-normal text-muted-foreground"
                    title={Array.isArray(email?.dkim_selectors_found) ? email.dkim_selectors_found.join(", ") : ""}
                  >
                    {dkimPresent
                      ? `${Array.isArray(email?.dkim_selectors_found) ? email.dkim_selectors_found.length : 0} selector(s) found`
                      : "Common selectors not found"}
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </EnrichmentSection>
    </>
  );

  return embedded ? (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-transparent", className)}>{sections}</div>
  ) : (
    <div className={cn("flex flex-col gap-4", className)}>{sections}</div>
  );
}

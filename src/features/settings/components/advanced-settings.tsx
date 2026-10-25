"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@/components/ui/data-table";
import { DataTable, dataTableToolbarInputClassName } from "@/components/ui/data-table";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { getOrganizationId } from "@/lib/organization";
import { listDomains, updateDomainScanSettings } from "@/services/api/domains";
import type { WatchedDomain } from "@/types";

export function AdvancedSettings() {
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);
  const [domains, setDomains] = useState<WatchedDomain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [savingDomainId, setSavingDomainId] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    if (!organizationId) {
      setDomains([]);
      setIsLoadingDomains(false);
      return () => {
        current = false;
      };
    }
    void listDomains(organizationId)
      .then((nextDomains) => {
        if (current) setDomains(nextDomains);
      })
      .catch((error) => {
        toast.error("Could not load scan settings", { description: parseApiError(error).message });
      })
      .finally(() => {
        if (current) setIsLoadingDomains(false);
      });
    return () => {
      current = false;
    };
  }, [organizationId]);

  const handleScanModeChange = useCallback(
    async (domain: WatchedDomain, enabled: boolean) => {
      if (!organizationId) return;
      setSavingDomainId(domain.id);
      try {
        const updated = await updateDomainScanSettings(organizationId, domain.id, enabled);
        setDomains((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast.success(enabled ? "Active scanning enabled" : "Passive scanning enabled", {
          description: `${domain.root_domain} will ${enabled ? "make requests to" : "only use passive checks for"} the monitored domain.`,
        });
      } catch (error) {
        toast.error("Could not update scan mode", { description: parseApiError(error).message });
      } finally {
        setSavingDomainId(null);
      }
    },
    [organizationId],
  );

  const scanModeColumns = useMemo<ColumnDef<WatchedDomain>[]>(
    () => [
      {
        cell: (domain) => (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-normal text-foreground">{domain.root_domain}</p>
          </div>
        ),
        header: "Domain",
        id: "root_domain",
        sortable: true,
        sortValue: (domain) => domain.root_domain,
        width: "1fr",
      },
      {
        cell: (domain) => (
          <Badge
            className={
              domain.active
                ? "border-transparent bg-emerald-500/15 px-1.5 text-[14px] font-normal text-emerald-700 dark:text-emerald-400"
                : "border-transparent bg-amber-500/15 px-1.5 text-[14px] font-normal text-amber-700 dark:text-amber-400"
            }
            variant="secondary"
          >
            {domain.active ? "Verified" : "Awaiting verification"}
          </Badge>
        ),
        header: "Verification",
        id: "verification",
        sortable: true,
        sortValue: (domain) => (domain.active ? "Verified" : "Awaiting verification"),
        width: "1fr",
      },
      {
        cell: (domain) => (
          <Badge className="border-border/80 bg-muted px-1.5 text-[14px] font-normal text-foreground" variant="outline">
            {domain.active_scan_enabled ? "Active" : "Passive"}
          </Badge>
        ),
        header: "Mode",
        id: "mode",
        sortable: true,
        sortValue: (domain) => (domain.active_scan_enabled ? "Active" : "Passive"),
        width: "0.7fr",
      },
      {
        align: "right",
        cell: (domain) => (
          <Switch
            aria-label={`Enable active scanning for ${domain.root_domain}`}
            checked={domain.active_scan_enabled}
            disabled={savingDomainId === domain.id || !domain.active}
            onCheckedChange={(checked) => void handleScanModeChange(domain, checked)}
          />
        ),
        header: "Active scanning",
        id: "active_scan",
        sortable: false,
        width: "0.8fr",
      },
    ],
    [handleScanModeChange, savingDomainId],
  );

  return (
    <div className="space-y-4">
      <div className="px-2">
        <h2 className="text-xl font-semibold text-foreground">Exposure Scan Mode</h2>
        <p className="mt-2 text-sm text-foreground/80">
          Passive scanning uses public data and does not make requests to your domain. Active scanning enables direct
          checks such as directory discovery and technology fingerprinting. This setting is stored separately for each
          domain.
        </p>
      </div>

      {isLoadingDomains ? (
        <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading domains…
        </div>
      ) : domains.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">Add and verify a domain to configure its scan mode.</p>
      ) : (
        <DataTable
          className="min-h-0"
          columns={scanModeColumns}
          data={domains}
          defaultPageSize={10}
          getRowKey={(domain) => domain.id}
          searchKey="root_domain"
          searchPlaceholder="Search Domains"
          showHeaderColumnSeparators={false}
          tableCellClassName="border-border/70 px-4 py-2 align-middle"
          tableClassName="table-fixed w-full"
          tableContainerClassName="rounded-lg border border-border bg-card"
          tableHeaderCellClassName="h-9 border-r border-border/70 px-3 text-[14px] font-normal last:border-r-0"
          tableHeaderClassName="!bg-[#fafafa] dark:!bg-card"
          tableRowClassName="h-12 w-full bg-card text-foreground font-normal hover:bg-muted/30"
          toolbarInputClassName={dataTableToolbarInputClassName}
        />
      )}
    </div>
  );
}

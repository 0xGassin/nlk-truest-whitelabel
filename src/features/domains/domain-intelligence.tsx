"use client";

import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast/toast";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/errors";
import { lookupDomainDNS, type DomainDNSRecords } from "@/services/api/domains";

function RecordList({ values }: { values?: string[] | null }) {
  const safeValues = values ?? [];
  if (safeValues.length === 0) return <span className="font-mono text-[13px] text-muted-foreground">No records found</span>;
  return <span className="block truncate font-mono text-[13px] leading-5" title={safeValues.join(", ")}>{safeValues.slice(0, 2).join(", ")}{safeValues.length > 2 ? ` +${safeValues.length - 2}` : ""}</span>;
}

function SmoothPanel({ children, open }: { children: ReactNode; open: boolean }) {
  return <div className={cn("grid will-change-[grid-template-rows,opacity] transition-[grid-template-rows,opacity] duration-[250ms] ease-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}><div className="min-h-0 overflow-hidden">{children}</div></div>;
}

export function DomainIntelligence({ className, domainId, embedded = false, organizationId }: { className?: string; domainId: string; embedded?: boolean; organizationId: string }) {
  const [records, setRecords] = useState<DomainDNSRecords | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId || !domainId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRecords(await lookupDomainDNS(organizationId, domainId));
    } catch (error) {
      const message = parseApiError(error).message;
      setError(message);
      toast.error("Could not load DNS records", { description: message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dnsRows = [["A", records?.a ?? []], ["AAAA", records?.aaaa ?? []], ["CNAME", records?.cname ?? []], ["MX", records?.mx ?? []], ["NS", records?.ns ?? []], ["TXT", records?.txt ?? []]] as const;
  const retryAction = error ? <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-2.5 text-[13px] text-muted-foreground"><span>DNS lookup unavailable.</span><Button className="h-7 shadow-none" onClick={() => void load()} size="sm" variant="outline">Retry</Button></div> : null;
  const recordsContent = <div className="bg-muted/30 px-0 py-0"><div className="font-mono">{dnsRows.map(([label, values], index) => <div className="grid min-h-10 grid-cols-[112px_minmax(0,1fr)] items-stretch border-b border-border/70 last:border-b-0" key={label}><span className="flex items-center border-r border-border/70 bg-muted/60 px-5 py-2.5 text-[13px] font-normal leading-5 text-foreground/70">{label}</span><div className="flex min-w-0 items-center justify-end px-5 py-2.5 text-right text-[13px] leading-5">{loading ? <Skeleton className={`h-4 ${index % 3 === 0 ? "w-36" : index % 3 === 1 ? "w-24" : "w-44"}`} /> : <RecordList values={values} />}</div></div>)}{retryAction}</div></div>;
  const summaryContent = <div className="grid gap-x-12 gap-y-6 px-5 pb-6 pt-5 sm:grid-cols-3">{dnsRows.map(([label, values], index) => <div className="min-w-0" key={label}><p className="text-sm text-muted-foreground">{label}</p><div className="mt-1 truncate font-mono text-sm font-normal text-foreground" title={values.join(", ")}>{loading ? <Skeleton className={`h-4 ${index % 3 === 0 ? "w-28" : index % 3 === 1 ? "w-20" : "w-32"}`} /> : values.join(", ") || "—"}</div></div>)}{error ? <div className="col-span-full flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-[13px] text-muted-foreground"><span>DNS lookup unavailable.</span><Button className="h-7 shadow-none" onClick={() => void load()} size="sm" variant="outline">Retry</Button></div> : null}</div>;

  if (embedded) {
    return <div className={cn("rounded-b-lg border-x border-b border-border bg-transparent", className)}><div className="px-5 pt-5 text-base font-medium leading-6">DNS Records</div>{summaryContent}</div>;
  }

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <CardHeader className="!flex items-center justify-between gap-0 border-b px-5 py-4 !pb-4">
        <button className="flex items-center gap-2 text-left" onClick={() => setIsOpen((current) => !current)} type="button"><ChevronRight className={`size-5 text-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} /><CardTitle className="text-base font-medium">DNS Records</CardTitle></button>
      </CardHeader>
      <SmoothPanel open={isOpen}><CardContent className="p-0">{recordsContent}</CardContent></SmoothPanel>
    </Card>
  );
}

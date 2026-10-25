"use client";

import { ArrowUp, ChevronRight, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { listDomainNetworkAssets, type DomainNetworkAsset } from "@/services/api/domains";
import { cn } from "@/lib/utils";

function formatJSON(value: unknown): string {
  let parsed = value;

  for (let attempt = 0; attempt < 2 && typeof parsed === "string"; attempt += 1) {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return String(parsed);
    }
  }

  if (typeof parsed === "string") return parsed;
  return JSON.stringify(parsed, null, 2);
}

export function DomainWhoisResponse({ className, domainId, embedded = false, organizationId }: { className?: string; domainId: string; embedded?: boolean; organizationId: string }) {
  const [assets, setAssets] = useState<DomainNetworkAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const responseRef = useRef<HTMLPreElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await listDomainNetworkAssets(organizationId, domainId));
    } catch (error) {
      toast.error("Could not load WHOIS response", { description: parseApiError(error).message });
    } finally {
      setLoading(false);
    }
  }, [domainId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const responseText = useMemo(() => {
    const response = assets.find((asset) => asset.type === "domain" && asset.attrs?.raw_response)?.attrs?.raw_response;
    if (!response) return "";
    return formatJSON(response);
  }, [assets]);

  const copyResponse = useCallback(async () => {
    if (!responseText) return;

    try {
      await navigator.clipboard.writeText(responseText);
      toast.success("WHOIS response copied", { description: "The raw response is now on your clipboard." });
    } catch {
      toast.error("Could not copy WHOIS response", { description: "Copying is not available in this browser." });
    }
  }, [responseText]);

  const content = (
    <>
      <CardHeader className="!flex items-center justify-between gap-0 border-b px-5 py-4 !pb-4">
        <button className="flex items-center gap-2 text-left" onClick={() => setIsOpen((current) => !current)} type="button">
          <ChevronRight className={`size-5 text-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
          <CardTitle className="text-base font-medium leading-6">WHOIS</CardTitle>
        </button>
        <Badge className="border-border/80 bg-muted px-1.5 text-foreground" variant="outline">
          {responseText ? `${responseText.split("\n").length} lines` : loading ? "Loading…" : "No data"}
        </Badge>
      </CardHeader>
      <div className={cn("grid will-change-[grid-template-rows,opacity] transition-[grid-template-rows,opacity] duration-[250ms] ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="min-h-0 overflow-hidden">
          <CardContent className="bg-muted/30 p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm text-muted-foreground">
              <button
                aria-label="Copy WHOIS response"
                className="inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={!responseText}
                onClick={() => void copyResponse()}
                type="button"
              >
                <Copy className="size-4" />
              </button>
              <span>{responseText ? `${responseText.split("\n").length} lines` : "No response"}</span>
            </div>
            <div className="relative">
              <pre
                className="max-h-[32rem] overflow-auto px-5 py-4 font-mono text-[14px] leading-6 text-foreground [scrollbar-gutter:stable]"
                onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 120)}
                ref={responseRef}
              >
                {responseText || "No WHOIS response available."}
              </pre>
              {showScrollTop ? (
                <button
                  aria-label="Scroll to top of WHOIS response"
                  className="absolute bottom-3 right-4 inline-flex size-8 items-center justify-center rounded-md border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => responseRef.current?.scrollTo({ behavior: "smooth", top: 0 })}
                  type="button"
                >
                  <ArrowUp className="size-4" />
                </button>
              ) : null}
            </div>
          </CardContent>
        </div>
      </div>
    </>
  );

  return embedded ? (
    <section className={cn("overflow-hidden border-b border-border", className)}>{content}</section>
  ) : (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>{content}</Card>
  );
}

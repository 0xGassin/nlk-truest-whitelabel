"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/flags/flag";
import { isFlagCode } from "@/components/flags/flag-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DottedMap, type DottedMapProps, type Marker } from "@/components/ui/dotted-map";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { StackedCardsIllustration } from "@/components/ui/stacked-cards-illustration";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { listAssetMapPoints, type AssetMapPoint } from "@/services/api/domains";
import type { DomainLookalike } from "@/types";

import { AssetMapSkeleton } from "./asset-map-skeleton";

type AssetMarker = Marker & {
  color: string;
  host: string;
  ip: string;
  location: string;
  organization: string;
  findings: number;
  isLookalike: boolean;
  coLocatedHosts: string[];
  countryCode?: string;
};

type AssetMarkerDetails = Omit<AssetMarker, "lat" | "lng">;
export type MappedLookalike = DomainLookalike & { domainId: string };

const assetMapCache = new Map<string, AssetMapPoint[]>();

export function AssetMap({
  className,
  domainId,
  findingsOnly = false,
  lookalikes = [],
  lookalikesOnly = false,
  dotColor = "currentColor",
  onReady,
  organizationId,
}: {
  className?: string;
  domainId?: string;
  findingsOnly?: boolean;
  lookalikes?: MappedLookalike[];
  lookalikesOnly?: boolean;
  dotColor?: string;
  onReady?: () => void;
  organizationId: string;
}) {
  const [points, setPoints] = useState<AssetMapPoint[]>([]);
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<null | { marker: AssetMarkerDetails; x: number; y: number }>(null);
  const mapReference = useRef<HTMLDivElement>(null);
  const hoverFrameReference = useRef<null | number>(null);
  const mapRevealFrameReference = useRef<null | number>(null);
  const pendingHoverReference = useRef<null | { marker: AssetMarkerDetails; x: number; y: number }>(null);
  const requestReference = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestReference.current;
    if (!organizationId) {
      setPoints([]);
      setError(null);
      setLoading(false);
      onReady?.();
      return;
    }

    const cachedPoints = assetMapCache.get(organizationId);
    if (cachedPoints) {
      setPoints(cachedPoints);
      setLoading(false);
      if (cachedPoints.length === 0) onReady?.();
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const nextPoints = await listAssetMapPoints(organizationId);
      if (requestId !== requestReference.current) return;

      assetMapCache.set(organizationId, nextPoints);
      setPoints(nextPoints);
      if (nextPoints.length === 0) onReady?.();
      if (!cachedPoints) {
        window.setTimeout(() => {
          mapRevealFrameReference.current = requestAnimationFrame(() => {
            mapRevealFrameReference.current = null;
            setLoading(false);
          });
        }, 0);
      }
    } catch (error) {
      if (requestId !== requestReference.current) return;
      const message = parseApiError(error).message;
      if (!cachedPoints) {
        setError(message);
        toast.error("Could not load asset map", { description: message });
        setLoading(false);
        onReady?.();
      }
    }
  }, [onReady, organizationId]);

  useEffect(() => {
    // The request synchronizes this component with the API; the lint rule cannot distinguish that from a synchronous update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(
    () => () => {
      if (hoverFrameReference.current !== null) cancelAnimationFrame(hoverFrameReference.current);
      if (mapRevealFrameReference.current !== null) cancelAnimationFrame(mapRevealFrameReference.current);
    },
    [],
  );

  const visiblePoints = useMemo(
    () =>
      points.filter((point) => (!domainId || point.domain_id === domainId) && (!findingsOnly || point.findings > 0)),
    [domainId, findingsOnly, points],
  );
  const lookalikeMatches = useMemo(() => {
    const names = new Set<string>();
    const normalizeName = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/^lookalike domain\s+/i, "")
        .replace(/\s+is registered(?:\s*\([^)]*\))?$/i, "")
        .replace(/\s*\([^)]*\)$/, "")
        .replace(/\.$/, "");
    for (const lookalike of lookalikes) {
      const details = lookalike.details ?? {};
      for (const name of [details.lookalike, details.unicode, lookalike.title]) {
        if (typeof name === "string") {
          names.add(`${lookalike.domainId}:${normalizeName(name)}`);
        }
      }
    }
    return names;
  }, [lookalikes]);

  const markers = useMemo<AssetMarker[]>(() => {
    const baseMarkers = visiblePoints.map((point) => {
      const pointNames = [point.root_domain, ...(point.hostnames ?? [])].map(
        (name) => `${point.domain_id}:${name.trim().toLowerCase().replace(/\.$/, "")}`,
      );
      // A shared IP does not make the watched host a lookalike. Match the
      // hostname instead so original hosts remain visible as blue pins.
      const isLookalike = pointNames.some((name) => lookalikeMatches.has(name));
      return {
        color: isLookalike ? "#ef4444" : "#2563eb",
        countryCode: point.country_code?.toLowerCase(),
        findings: point.findings,
        host: point.hostnames?.[0] || point.root_domain || "Unattributed host",
        lat: point.lat,
        lng: point.lon,
        ip: point.ip || "Unavailable",
        location: [point.city, point.country].filter(Boolean).join(", ") || "Unknown location",
        organization: point.org || "Unknown organization",
        isLookalike,
        coLocatedHosts: [],
        size: 0.46,
      };
    });
    const namesByLocation = new Map<string, string[]>();
    for (const marker of baseMarkers) {
      if (!marker.isLookalike) continue;
      const key = `${String(marker.lat)}:${String(marker.lng)}`;
      const names = namesByLocation.get(key) ?? [];
      if (!names.includes(marker.host)) names.push(marker.host);
      namesByLocation.set(key, names);
    }
    return baseMarkers
      .map((marker) => ({
        ...marker,
        coLocatedHosts: namesByLocation.get(`${String(marker.lat)}:${String(marker.lng)}`) ?? [marker.host],
      }))
      .filter((marker) => !lookalikesOnly || marker.isLookalike);
  }, [lookalikeMatches, lookalikesOnly, visiblePoints]);

  const updateHoveredMarker = useCallback((marker: AssetMarkerDetails, clientX: number, clientY: number) => {
    const mapBounds = mapReference.current?.getBoundingClientRect();
    if (!mapBounds) return;

    const x = Math.max(184, Math.min(mapBounds.width - 184, clientX - mapBounds.left));
    const y = Math.max(96, Math.min(mapBounds.height - 8, clientY - mapBounds.top));
    pendingHoverReference.current = { marker, x, y };
    if (hoverFrameReference.current !== null) return;

    hoverFrameReference.current = requestAnimationFrame(() => {
      hoverFrameReference.current = null;
      const pendingHover = pendingHoverReference.current;
      if (pendingHover) setHoveredMarker(pendingHover);
    });
  }, []);

  const clearHoveredMarker = useCallback(() => {
    if (hoverFrameReference.current !== null) {
      cancelAnimationFrame(hoverFrameReference.current);
      hoverFrameReference.current = null;
    }
    pendingHoverReference.current = null;
    setHoveredMarker(null);
  }, []);

  const markMapReady = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsMapReady(true);
        onReady?.();
      });
    });
  }, [onReady]);

  const renderAssetMarker = useCallback<NonNullable<DottedMapProps<AssetMarker>["renderMarkerOverlay"]>>(
    ({ marker, r, x, y }) => (
      <circle
        className="cursor-pointer"
        cx={x}
        cy={y}
        fill={marker.color}
        onPointerEnter={(event) => {
          updateHoveredMarker(marker, event.clientX, event.clientY);
        }}
        onPointerLeave={clearHoveredMarker}
        onPointerMove={(event) => {
          updateHoveredMarker(marker, event.clientX, event.clientY);
        }}
        r={r}
      />
    ),
    [clearHoveredMarker, updateHoveredMarker],
  );

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-0 bg-transparent py-0 font-sans text-[14px] shadow-none ring-0",
        className,
      )}
    >
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {error ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-5 text-center text-[14px] text-muted-foreground">
            <p>Could not load geolocated assets.</p>
            <Button className="shadow-none" onClick={() => void load()} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        ) : !loading && (visiblePoints.length === 0 || markers.length === 0) ? (
          <Empty className="min-h-0 flex-1 border-0 !bg-transparent px-5 py-8">
            <EmptyHeader className="!bg-transparent">
              <EmptyMedia className="mb-4 !bg-transparent">
                <StackedCardsIllustration />
              </EmptyMedia>
              <EmptyTitle className="text-label-14">
                {lookalikesOnly ? "No lookalike hosts" : "No geolocated hosts"}
              </EmptyTitle>
              <EmptyDescription className="text-copy-14">
                {lookalikesOnly
                  ? "No geolocated lookalike hosts are available yet."
                  : "No geolocated hosts are available yet."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-transparent"
            ref={mapReference}
          >
            <div
              className={cn(
                "flex size-full items-center justify-center opacity-0 transition-opacity duration-300 ease-out",
                !loading && isMapReady ? "opacity-100" : null,
              )}
            >
              <div className="size-full max-w-[1400px]">
                <DottedMap<AssetMarker>
                  aria-label="Geographic asset map"
                  className="text-foreground/80"
                  dotColor={dotColor}
                  dotRadius={0.14}
                  mapSamples={5000}
                  markerColor="transparent"
                  markers={markers}
                  onReady={markMapReady}
                  renderMarkerOverlay={renderAssetMarker}
                />
              </div>
            </div>
            {loading || !isMapReady ? (
              <div className="absolute inset-0 z-10">
                <AssetMapSkeleton />
              </div>
            ) : null}
            {hoveredMarker ? (
              <div
                className="pointer-events-none absolute z-10 w-[23rem] -translate-x-1/2 translate-y-[-calc(100%+12px)] rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-left font-sans text-[14px] text-white shadow-xl shadow-black/25"
                style={{ left: hoveredMarker.x, top: hoveredMarker.y }}
              >
                {hoveredMarker.marker.isLookalike && hoveredMarker.marker.coLocatedHosts.length > 1 ? (
                  <>
                    <p className="font-medium tracking-tight text-white">Lookalikes</p>
                    <ul className="mt-1 max-h-24 space-y-0.5 overflow-auto text-white/90">
                      {hoveredMarker.marker.coLocatedHosts.map((host) => (
                        <li className="truncate" key={host}>
                          {host}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="truncate font-medium tracking-tight text-white">{hoveredMarker.marker.host}</p>
                )}
                <p className="mt-0.5 text-[14px] text-white/55">
                  {hoveredMarker.marker.isLookalike
                    ? hoveredMarker.marker.coLocatedHosts.length > 1
                      ? "Lookalike hosts"
                      : "Lookalike"
                    : "Host"}
                </p>
                <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-white/65">
                  {hoveredMarker.marker.coLocatedHosts.length === 1 ? (
                    <>
                      <span>IP</span>
                      <span className="font-mono text-white/90">{hoveredMarker.marker.ip}</span>
                    </>
                  ) : null}
                  <span>Location</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-white/90">
                    {hoveredMarker.marker.countryCode && isFlagCode(hoveredMarker.marker.countryCode) ? (
                      <span className="inline-flex size-5 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                        <Flag
                          alt=""
                          className="size-full rounded-none object-cover"
                          code={hoveredMarker.marker.countryCode}
                          decorative
                          format="svg"
                          ratio="1x1"
                          width={24}
                        />
                      </span>
                    ) : null}
                    <span className="truncate">{hoveredMarker.marker.location}</span>
                  </span>
                  <span>Organization</span>
                  <span className="truncate text-white/90">{hoveredMarker.marker.organization}</span>
                </div>
                <p className="-mx-3 mt-1 border-t border-white/10 px-3 pt-1 text-white/70">
                  {hoveredMarker.marker.findings > 0
                    ? `${String(hoveredMarker.marker.findings)} open finding${hoveredMarker.marker.findings === 1 ? "" : "s"}`
                    : "No open findings"}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

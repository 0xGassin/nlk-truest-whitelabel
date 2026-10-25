"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const DEFAULT_MARKERS: Marker[] = [];
const dotPathCache = new Map<string, string>();
const MAP_LATITUDE_MAX = 71;
const MAP_LATITUDE_MIN = -56;
const MAP_LONGITUDE_MAX = 179;
const MAP_LONGITUDE_MIN = -179;
const MAP_RADIUS = 0.3;

export interface Marker {
  lat: number;
  lng: number;
  pulse?: boolean;
  size?: number;
}

type MapMarker<M extends Marker> = Omit<M, "lat" | "lng"> & {
  x: number;
  y: number;
};

interface WorkerResponse {
  key: string;
  path: string;
}

export interface DottedMapProps<M extends Marker = Marker> extends React.SVGProps<SVGSVGElement> {
  dotColor?: string;
  dotRadius?: number;
  height?: number;
  mapSamples?: number;
  markerColor?: string;
  markers?: M[];
  onReady?: () => void;
  pulse?: boolean;
  renderMarkerOverlay?: (args: {
    index: number;
    marker: MapMarker<M>;
    r: number;
    x: number;
    y: number;
  }) => React.ReactNode;
  stagger?: boolean;
  width?: number;
}

function project(longitude: number, latitude: number): [number, number] {
  const x = (longitude * 20037508.34) / 180;
  const y = ((Math.log(Math.tan(((90 + latitude) * Math.PI) / 360)) / (Math.PI / 180)) * 20037508.34) / 180;
  return [x, y];
}

function projectMarkers<M extends Marker>(
  markers: M[],
  height: number,
  mapSamples: number,
  stagger: boolean,
  width: number,
): MapMarker<M>[] {
  const aspectRatio = width / height;
  const rows = Math.round(Math.sqrt(mapSamples / aspectRatio));
  const columns = Math.round(rows * aspectRatio);
  const padding = MAP_RADIUS * 1.25;
  const drawableWidth = width - 2 * padding;
  const drawableHeight = height - 2 * padding;
  const [minimumX, maximumY] = project(MAP_LONGITUDE_MIN, MAP_LATITUDE_MAX);
  const [maximumX, minimumY] = project(MAP_LONGITUDE_MAX, MAP_LATITUDE_MIN);
  const xRange = maximumX - minimumX;
  const yRange = maximumY - minimumY;
  const xStep = drawableWidth / (columns - 1);

  return markers.map(({ lat, lng, ...marker }) => {
    const [projectedX, projectedY] = project(lng, lat);
    const column = Math.round(((projectedX - minimumX) / xRange) * (columns - 1));
    const row = Math.round(((maximumY - projectedY) / yRange) * (rows - 1));
    return {
      ...marker,
      x: padding + column * xStep + (stagger && row % 2 === 1 ? xStep / 2 : 0),
      y: padding + row * (drawableHeight / (rows - 1)),
    } as MapMarker<M>;
  });
}

function DottedMapComponent<M extends Marker = Marker>({
  className,
  dotColor = "currentColor",
  dotRadius = 0.2,
  height = 75,
  mapSamples = 5000,
  markerColor = "#FF6900",
  markers = DEFAULT_MARKERS as M[],
  onReady,
  pulse = false,
  renderMarkerOverlay,
  stagger = true,
  style,
  width = 150,
  ...svgProps
}: DottedMapProps<M>) {
  const geometryKey = `${width}:${height}:${mapSamples}:${dotRadius}:${stagger ? "staggered" : "linear"}`;
  const [dotPath, setDotPath] = React.useState<string | null>(() => dotPathCache.get(geometryKey) ?? null);
  const processedMarkers = React.useMemo(
    () => projectMarkers(markers, height, mapSamples, stagger, width),
    [height, mapSamples, markers, stagger, width],
  );

  React.useEffect(() => {
    const cachedPath = dotPathCache.get(geometryKey);
    if (cachedPath) {
      setDotPath(cachedPath);
      onReady?.();
      return;
    }

    setDotPath(null);
    const worker = new Worker(new URL("./dotted-map.worker.ts", import.meta.url));
    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      if (event.data.key !== geometryKey) return;
      dotPathCache.set(geometryKey, event.data.path);
      setDotPath(event.data.path);
      onReady?.();
      worker.terminate();
    });
    worker.postMessage({ dotRadius, height, key: geometryKey, mapSamples, stagger, width });
    return () => worker.terminate();
  }, [dotRadius, geometryKey, height, mapSamples, onReady, stagger, width]);

  return (
    <svg
      {...svgProps}
      aria-busy={dotPath === null}
      className={cn("text-gray-500 dark:text-muted-foreground", className)}
      style={{ height: "100%", width: "100%", ...style }}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
    >
      {dotPath ? <path d={dotPath} fill={dotColor} /> : null}
      {processedMarkers.map((marker, index) => {
        const r = marker.size ?? dotRadius;
        const shouldPulse = pulse ? marker.pulse !== false : marker.pulse === true;
        const pulseTo = r * 2.8;

        return (
          <g key={`${String(marker.x)}-${String(marker.y)}-${String(index)}`}>
            <circle cx={marker.x} cy={marker.y} fill={markerColor} r={r} />
            {shouldPulse ? (
              <g pointerEvents="none">
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  fill="none"
                  r={r}
                  stroke={markerColor}
                  strokeOpacity={1}
                  strokeWidth={0.35}
                >
                  <animate
                    attributeName="r"
                    dur="1.4s"
                    repeatCount="indefinite"
                    values={`${String(r)};${String(pulseTo)}`}
                  />
                  <animate attributeName="opacity" dur="1.4s" repeatCount="indefinite" values="1;0" />
                </circle>
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  fill="none"
                  r={r}
                  stroke={markerColor}
                  strokeOpacity={0.9}
                  strokeWidth={0.3}
                >
                  <animate
                    attributeName="r"
                    begin="0.7s"
                    dur="1.4s"
                    repeatCount="indefinite"
                    values={`${String(r)};${String(pulseTo)}`}
                  />
                  <animate attributeName="opacity" begin="0.7s" dur="1.4s" repeatCount="indefinite" values="0.9;0" />
                </circle>
              </g>
            ) : null}
            {renderMarkerOverlay?.({ index, marker, r, x: marker.x, y: marker.y })}
          </g>
        );
      })}
    </svg>
  );
}

export const DottedMap = React.memo(DottedMapComponent) as typeof DottedMapComponent;

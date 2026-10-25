import { createMap } from "svg-dotted-map";

interface BuildMapMessage {
  dotRadius: number;
  height: number;
  key: string;
  mapSamples: number;
  stagger: boolean;
  width: number;
}

const pathCache = new Map<string, string>();

function buildDotPath({ dotRadius, height, key, mapSamples, stagger, width }: BuildMapMessage) {
  const cachedPath = pathCache.get(key);
  if (cachedPath) return cachedPath;

  const { points } = createMap({ height, mapSamples, width });
  const sortedPoints = [...points].sort((first, second) => first.y - second.y || first.x - second.x);
  const rowIndexes = new Map<number, number>();
  let previousX = Number.NaN;
  let previousY = Number.NaN;
  let xStep = 0;

  for (const point of sortedPoints) {
    if (point.y !== previousY) {
      previousY = point.y;
      previousX = Number.NaN;
      if (!rowIndexes.has(point.y)) rowIndexes.set(point.y, rowIndexes.size);
    }
    if (!Number.isNaN(previousX)) {
      const step = point.x - previousX;
      xStep = xStep === 0 ? step : Math.min(xStep, step);
    }
    previousX = point.x;
  }

  const diameter = dotRadius * 2;
  const path = points.map((point) => {
    const rowIndex = rowIndexes.get(point.y) ?? 0;
    const x = point.x + (stagger && rowIndex % 2 === 1 ? xStep / 2 : 0);
    return `M${x - dotRadius} ${point.y}a${dotRadius} ${dotRadius} 0 1 0 ${diameter} 0a${dotRadius} ${dotRadius} 0 1 0 -${diameter} 0`;
  }).join("");

  pathCache.set(key, path);
  return path;
}

self.addEventListener("message", (event: MessageEvent<BuildMapMessage>) => {
  const request = event.data;
  self.postMessage({ key: request.key, path: buildDotPath(request) });
});

export {};

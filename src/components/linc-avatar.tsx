"use client";

import { useMemo } from "react";

import Iridescence from "@/components/iridescence";
import { cn } from "@/lib/utils";

export interface LincColorPreset {
  fallback: string;
  key: string;
  name: string;
  rgb: [number, number, number];
}

export const LINC_COLORS: LincColorPreset[] = [
  {
    fallback:
      "radial-gradient(circle at 32% 26%, #eab39c 0%, #cc9380 45%, #8d6050 100%)",
    key: "peach",
    name: "Blush",
    rgb: [0.8, 0.576, 0.502],
  },
  {
    fallback:
      "radial-gradient(circle at 32% 26%, #f2968b 0%, #e86a5a 45%, #a03f33 100%)",
    key: "coral",
    name: "Ember",
    rgb: [0.91, 0.416, 0.353],
  },
  {
    fallback:
      "radial-gradient(circle at 32% 26%, #8bd9b0 0%, #58c08b 45%, #3b7f5d 100%)",
    key: "mint",
    name: "Sage",
    rgb: [0.345, 0.753, 0.545],
  },
  {
    fallback:
      "radial-gradient(circle at 32% 26%, #8cc4f2 0%, #5aa7e8 45%, #3a6da8 100%)",
    key: "sky",
    name: "Glacier",
    rgb: [0.353, 0.655, 0.91],
  },
  {
    fallback:
      "radial-gradient(circle at 32% 26%, #b39ff0 0%, #8f72e8 45%, #5d48a8 100%)",
    key: "violet",
    name: "Amethyst",
    rgb: [0.561, 0.447, 0.91],
  },
  {
    fallback:
      "radial-gradient(circle at 32% 26%, #f3c583 0%, #e8a44a 45%, #a8722b 100%)",
    key: "amber",
    name: "Nova",
    rgb: [0.91, 0.643, 0.29],
  },
];

export const DEFAULT_LINC_COLOR = LINC_COLORS[0];

const LINC_SPEED = 0.3;

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function webglAvailable(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (globalThis.window === undefined) return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface LincAvatarProps {
  className?: string;
  color?: LincColorPreset;
  shadow?: boolean;
}

/**
 * Linc's signature avatar: an iridescent shader orb with film grain.
 * The WebGL animation runs slowly and never reacts to the mouse.
 * Falls back to a static gradient orb when WebGL is unavailable.
 */
export function LincAvatar({
  className,
  color = DEFAULT_LINC_COLOR,
  shadow = true,
}: LincAvatarProps) {
  const webgl = useMemo(() => webglAvailable(), []);

  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10 ring-inset",
        shadow && "shadow-[0_2px_10px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {webgl ? (
        <Iridescence className="absolute inset-0 size-full" color={color.rgb} mouseReact={false} speed={LINC_SPEED} />
      ) : (
        <div className="absolute inset-0" style={{ backgroundImage: color.fallback }} />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAIN_URI, mixBlendMode: "overlay", opacity: 0.22 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_26%,transparent_52%,rgba(0,0,0,0.28)_100%)]"
      />
    </div>
  );
}

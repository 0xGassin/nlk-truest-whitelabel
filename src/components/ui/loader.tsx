"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { ShaderMount } from "./shader-mount";
import { blurFragmentShader, ditherFragmentShader, hexToRgba, plainFragmentShader } from "./shaders";

type LoaderShape = "ripple" | "sphere" | "swirl";
type LoaderStyle = "blur" | "dither" | "plain";

const sizeConfig = {
  default: { height: 80, width: 80 },
  lg: { height: 120, width: 120 },
  sm: { height: 48, width: 48 },
};

const shapeMap: Record<LoaderShape, number> = {
  ripple: 3,
  sphere: 1,
  swirl: 2,
};

const shaderMap: Record<LoaderStyle, string> = {
  blur: blurFragmentShader,
  dither: ditherFragmentShader,
  plain: plainFragmentShader,
};

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary color */
  color?: string;
  /** Background color */
  colorBack?: string;
  /** Maximum animation frame rate. */
  frameRate?: number;
  /** Custom height (overrides size preset) */
  height?: number;
  /** Base shape of the loader */
  shape?: LoaderShape;
  /** Size preset (maps to width/height) */
  size?: keyof typeof sizeConfig;
  /** Animation speed multiplier */
  speed?: number;
  /** Visual style: plain (solid), blur (soft), or dither (pixelated) */
  variant?: LoaderStyle;
  /** Custom width (overrides size preset) */
  width?: number;
}

function Loader({
  className,
  color = "#00b3ff",
  colorBack = "transparent",
  frameRate,
  height,
  shape = "sphere",
  size = "default",
  speed = 1,
  style,
  variant = "dither",
  width,
  ...props
}: LoaderProps) {
  const sizeDefaults = sizeConfig[size];
  const resolvedWidth = width ?? sizeDefaults.width;
  const resolvedHeight = height ?? sizeDefaults.height;

  const fragmentShader = shaderMap[variant];
  const shapeValue = shapeMap[shape];
  const scale = variant === "blur" ? 0.52 : variant === "dither" ? 0.48 : 0.5;
  const usesCssVariables = color.includes("var(") || colorBack.includes("var(");
  const [cssVariableEpoch, setCssVariableEpoch] = React.useState(0);

  React.useEffect(() => {
    if (!usesCssVariables || typeof document === "undefined") {
      return;
    }

    const bumpCssVariableEpoch = () => {
      setCssVariableEpoch((value) => value + 1);
    };

    // Resolve once after mount, then re-resolve on theme/token changes.
    bumpCssVariableEpoch();

    const attributeFilter = ["class", "style", "data-theme"];
    const observer = new MutationObserver(bumpCssVariableEpoch);
    observer.observe(document.documentElement, {
      attributeFilter,
      attributes: true,
    });
    observer.observe(document.body, {
      attributeFilter,
      attributes: true,
    });

    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", bumpCssVariableEpoch);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", bumpCssVariableEpoch);
    };
  }, [usesCssVariables]);

  const uniforms = React.useMemo(
    () => ({
      u_colorBack: hexToRgba(colorBack),
      u_colorFront: hexToRgba(color),
      u_pxSize: 2, // Pixel size for dithering
      u_scale: scale,
      u_shape: shapeValue,
    }),
    [color, colorBack, shapeValue, scale, cssVariableEpoch],
  );

  return (
    <div
      className={cn("relative", className)}
      data-slot="loader"
      style={{
        height: resolvedHeight,
        width: resolvedWidth,
        ...style,
      }}
      {...props}
    >
      <ShaderMount
        fragmentShader={fragmentShader}
        frameRate={frameRate}
        height={resolvedHeight}
        speed={speed}
        uniforms={uniforms}
        width={resolvedWidth}
      />
    </div>
  );
}

export { Loader, sizeConfig };
export type { LoaderProps, LoaderShape, LoaderStyle };

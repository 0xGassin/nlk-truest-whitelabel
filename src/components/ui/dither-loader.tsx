"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Loader } from "@/components/ui/loader";

// Dynamically import the Dither component to avoid SSR issues
const DitherComponent = dynamic(() => import("./dither").then((m) => m.Dither), {
  loading: () => <div className="size-full bg-background" />,
  ssr: false,
});

interface DitherLoaderProps {
  fullScreen?: boolean;
  message?: string;
  size?: "default" | "lg" | "sm";
}

/**
 * Dither-based loader animation component
 * Can be used as a spinner or full-screen loader
 */
export function DitherLoader({ fullScreen = false, message, size = "default" }: DitherLoaderProps) {
  const label = message ?? "Loading";
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributeFilter: ["class"], attributes: true });
    return () => observer.disconnect();
  }, []);

  if (fullScreen) {
    return (
      <div
        aria-label={label}
        className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        role="status"
      >
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 size-24 overflow-hidden motion-safe:duration-300">
          <DitherComponent
            colorNum={4}
            enableMouseInteraction={false}
            pixelSize={2}
            waveAmplitude={0.3}
            waveColor={isDark ? [0.83, 0.83, 0.83] : [0, 0, 0]}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>
      </div>
    );
  }

  // For inline use, use the existing Loader component with dither variant
  const sizeMap = {
    default: 80,
    lg: 120,
    sm: 48,
  };

  return (
    <div
      aria-label={label}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      role="status"
      style={{ height: sizeMap[size], width: sizeMap[size] }}
    >
      <Loader
        color={isDark ? "#d4d4d4" : "#000000"}
        frameRate={30}
        height={sizeMap[size]}
        shape="sphere"
        variant="dither"
        width={sizeMap[size]}
      />
    </div>
  );
}

export { DitherComponent };

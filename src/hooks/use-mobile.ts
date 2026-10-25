"use client";

import * as React from "react";

/** Hook to detect if viewport matches mobile breakpoint */
export function useIsMobile(query = "(max-width: 768px)") {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = globalThis.matchMedia(query);
    setIsMobile(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return isMobile;
}

"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect the current theme (light/dark) by observing the document element's class list
 * @returns boolean indicating if the theme is dark
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDark;
}

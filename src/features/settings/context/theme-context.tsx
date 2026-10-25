"use client";

import * as React from "react";

type Theme = "dark" | "soft" | "system";
type Radius = number;
const HIGH_CONTRAST_POPUP_OPTIONS = ["off", "sidebar", "full"] as const;
type HighContrastPopups = (typeof HIGH_CONTRAST_POPUP_OPTIONS)[number];

const SUPPORTED_THEMES = ["soft", "dark", "system"] as const;
const LEGACY_THEMES = new Set(["grape", "mixed", "navy"]);
const THEME_ALIASES: Record<string, Theme> = {
  light: "soft",
};
const HIGH_CONTRAST_POPUPS_KEY = "highContrastPopups";

const normalizeHighContrastPopups = (value: null | string): HighContrastPopups =>
  HIGH_CONTRAST_POPUP_OPTIONS.includes(value as HighContrastPopups) ? (value as HighContrastPopups) : "sidebar";

const normalizeTheme = (theme: null | string): Theme => {
  if (theme && theme in THEME_ALIASES) {
    return THEME_ALIASES[theme];
  }

  if (theme && SUPPORTED_THEMES.includes(theme as Theme)) {
    return theme as Theme;
  }

  return "soft";
};

interface ThemeContextType {
  highContrastPopups: HighContrastPopups;
  radius: Radius;
  setHighContrastPopups: (enabled: HighContrastPopups) => void;
  setRadius: (radius: Radius) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage immediately (synchronously) to match the blocking script
  // eslint-disable-next-line @eslint-react/use-state
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (globalThis.window !== undefined) {
      const stored = localStorage.getItem("theme");
      if (stored && LEGACY_THEMES.has(stored)) {
        return "soft";
      }

      return normalizeTheme(stored);
    }
    return "soft";
  });

  // eslint-disable-next-line @eslint-react/use-state
  const [radius, setRadiusState] = React.useState<Radius>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (globalThis.window !== undefined) {
      const stored = localStorage.getItem("radius");
      const parsed = stored ? Number.parseFloat(stored) : 0.5;
      return Number.isFinite(parsed) ? parsed : 0.5;
    }
    return 0.5;
  });

  // eslint-disable-next-line @eslint-react/use-state
  const [highContrastPopups, setHighContrastPopupsState] = React.useState<HighContrastPopups>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (globalThis.window !== undefined) {
      return normalizeHighContrastPopups(localStorage.getItem(HIGH_CONTRAST_POPUPS_KEY));
    }
    return "sidebar";
  });

  React.useEffect(() => {
    // Sync with localStorage in case it changed in another tab
    const handleStorageChange = () => {
      const storedTheme = localStorage.getItem("theme");
      const normalizedTheme = storedTheme && LEGACY_THEMES.has(storedTheme) ? "soft" : normalizeTheme(storedTheme);

      if (normalizedTheme !== theme) {
        setThemeState(normalizedTheme);
      }

      const storedRadius = localStorage.getItem("radius");
      const normalizedRadius = storedRadius ? Number.parseFloat(storedRadius) : Number.NaN;
      if (Number.isFinite(normalizedRadius) && normalizedRadius !== radius) {
        setRadiusState(normalizedRadius);
      }

      const storedHighContrastPopups = localStorage.getItem(HIGH_CONTRAST_POPUPS_KEY);
      const normalizedHighContrastPopups = normalizeHighContrastPopups(storedHighContrastPopups);
      if (normalizedHighContrastPopups !== highContrastPopups) {
        setHighContrastPopupsState(normalizedHighContrastPopups);
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);
    return () => {
      globalThis.removeEventListener("storage", handleStorageChange);
    };
  }, [theme, radius, highContrastPopups]);

  React.useEffect(() => {
    const root = globalThis.document.documentElement;
    root.classList.remove("soft", "clean", "dark", "light");

    // Temporarily enable transitions for a smooth theme switch
    root.classList.add("theme-transitioning");

    if (theme === "system") {
      const systemTheme = globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "soft";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    const timeout = globalThis.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 250);

    return () => {
      root.classList.remove("theme-transitioning");
      globalThis.clearTimeout(timeout);
    };
  }, [theme]);

  React.useEffect(() => {
    const root = globalThis.document.documentElement;
    root.style.setProperty("--radius", `${String(radius)}rem`);
  }, [radius]);

  // Toggle high-contrast-full class for "full" mode
  React.useEffect(() => {
    const root = globalThis.document.documentElement;
    root.classList.toggle("high-contrast-full", highContrastPopups === "full");
  }, [highContrastPopups]);

  // Listen for system theme changes when theme is set to "system"
  React.useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = globalThis.document.documentElement;
      root.classList.remove("soft", "clean", "dark", "light");
      root.classList.add(e.matches ? "dark" : "soft");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    setThemeState(newTheme);
  };

  const setRadius = (newRadius: Radius) => {
    localStorage.setItem("radius", String(newRadius));
    setRadiusState(newRadius);
  };

  const setHighContrastPopups = (value: HighContrastPopups) => {
    localStorage.setItem(HIGH_CONTRAST_POPUPS_KEY, value);
    setHighContrastPopupsState(value);
  };

  return (
    <ThemeContext value={{ highContrastPopups, radius, setHighContrastPopups, setRadius, setTheme, theme }}>
      {children}
    </ThemeContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = React.use(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

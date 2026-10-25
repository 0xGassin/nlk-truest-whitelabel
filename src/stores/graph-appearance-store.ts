import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type GraphBackgroundPattern = "cross" | "dots";

interface GraphAppearanceState {
  pattern: GraphBackgroundPattern;
  setPattern: (pattern: GraphBackgroundPattern) => void;
}

export const useGraphAppearance = create<GraphAppearanceState>()(
  persist(
    (set) => ({
      pattern: "cross",
      setPattern: (pattern: GraphBackgroundPattern) => {
        set({ pattern });
      },
    }),
    {
      name: "graph-background-pattern",
      storage: createJSONStorage(() => globalThis.localStorage),
    },
  ),
);

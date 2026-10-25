import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_LINC_COLOR } from "@/components/linc-avatar";

interface LincColorState {
  colorKey: string;
  selectColor: (key: string) => void;
}

export const useLincColor = create<LincColorState>()(
  persist(
    (set) => ({
      colorKey: DEFAULT_LINC_COLOR.key,
      selectColor: (key: string) => {
        set({ colorKey: key });
      },
    }),
    {
      name: "linc-avatar-color",
      storage: createJSONStorage(() => globalThis.localStorage),
    },
  ),
);

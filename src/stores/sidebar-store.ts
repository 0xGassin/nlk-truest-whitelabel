import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SidebarStore {
  open: boolean;
  openMobile: boolean;
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      open: true,
      openMobile: false,
      setOpen: (open) => set({ open }),
      setOpenMobile: (openMobile) => set({ openMobile }),
      toggleSidebar: () => {
        const { open } = get();
        // Toggle the desktop sidebar state.
        // Mobile state is managed separately via setOpenMobile from components
        // that have access to the viewport size.
        set({ open: !open });
      },
    }),
    {
      name: "sidebar-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

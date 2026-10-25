import { create } from "zustand";

interface BreadcrumbState {
  /** Clear the details page breadcrumb */
  clearDetailsPage: () => void;
  /** For details view navigation - stores the current selected item name */
  detailsPage: null | string;
  /** Callback to go back to the list view */
  onBack: (() => void) | null;
  /** Set the details page breadcrumb */
  setDetailsPage: (name: null | string, onBack: (() => void) | null) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>()((set) => ({
  clearDetailsPage: () => {
    set({ detailsPage: null, onBack: null });
  },
  detailsPage: null,
  onBack: null,
  setDetailsPage: (name, onBack) => {
    set({ detailsPage: name, onBack });
  },
}));

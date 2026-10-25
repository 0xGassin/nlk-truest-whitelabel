import type { OrganizationInvitation } from "@/types";

import { create } from "zustand";

import { logger } from "@/lib/logger";
import { invitationService } from "@/services/api";

import { useAuthStore } from "./auth-store";

interface NotificationsState {
  fetchInvitations: () => Promise<void>;
  invitations: OrganizationInvitation[];
  pendingCount: number;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  fetchInvitations: async () => {
    if (!useAuthStore.getState().isAuthenticated) return;
    try {
      const invitations = await invitationService.getIncomingInvitations();
      const pendingCount = invitations.filter(
        (invitation) => invitation.status === "pending" && new Date(invitation.expires_at) > new Date(),
      ).length;
      set({ invitations, pendingCount });
    } catch (error) {
      logger.error("Failed to fetch notifications", { error });
    }
  },
  invitations: [],
  pendingCount: 0,
}));

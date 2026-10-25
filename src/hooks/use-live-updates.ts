import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/config";
import { IS_WHITELABEL_MODE } from "@/config/whitelabel";
import { getSessionToken } from "@/lib/auth/session-token";
import { readEventStream } from "@/lib/event-stream";
import { useAuthStore } from "@/stores/auth-store";

export interface ScanUpdate {
  connection_id?: string;
  critical_count?: number;
  high_count?: number;
  id: string; // scan_id or repo_id
  low_count?: number;
  medium_count?: number;
  message: string;
  org_id: string;
  progress: number;
  status: string;
  type: "container_scan" | "cspm_scan" | "inventory_scan" | "repo_scan";
  vulnerabilities_count?: number;
}

export function useLiveUpdates(orgId?: string) {
  const [updates, setUpdates] = useState<Record<string, ScanUpdate>>({});
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!orgId || !isAuthenticated) return;

    // Read with fetch rather than EventSource, which cannot send the bearer
    // token a whitelabel build authenticates with.
    const controller = new AbortController();
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const handleData = (data: string) => {
      try {
        const rawData: unknown = JSON.parse(data);
        const update = rawData as ScanUpdate;
        const id = update.id;
        setUpdates((prev) => ({
          ...prev,
          [id]: update,
        }));
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    const connect = async () => {
      const token = getSessionToken();
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/organizations/${orgId}/live-updates`, {
          credentials: IS_WHITELABEL_MODE ? "omit" : "include",
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (response.ok && response.body) {
          await readEventStream(response.body, handleData);
        }
      } catch {
        // A dropped or refused connection is retried below.
      }

      if (controller.signal.aborted) return;
      reconnectTimeout = setTimeout(() => {
        void connect();
      }, 5000);
    };

    void connect();

    return () => {
      controller.abort();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [orgId, isAuthenticated]);

  const getUpdate = (id: string) => updates[id];

  return { getUpdate, updates };
}

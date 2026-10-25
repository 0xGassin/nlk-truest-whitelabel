import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/config";
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

    let reconnectTimeout: NodeJS.Timeout | null = null;

    const handleMessage = (event: MessageEvent) => {
      try {
        const rawData: unknown = JSON.parse(String(event.data));
        const data = rawData as ScanUpdate;
        const id = data.id;
        setUpdates((prev) => ({
          ...prev,
          [id]: data,
        }));
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    const handleError = () => {
      if (currentEventSource) {
        currentEventSource.removeEventListener("message", handleMessage);
        currentEventSource.removeEventListener("error", handleError);
        currentEventSource.close();
      }

      reconnectTimeout = setTimeout(() => {
        connect();
      }, 5000);
    };

    let currentEventSource: EventSource | null = null;

    const connect = () => {
      const url = `${API_BASE_URL}/api/v1/organizations/${orgId}/live-updates`;
      currentEventSource = new EventSource(url, { withCredentials: true });
      currentEventSource.addEventListener("message", handleMessage);
      currentEventSource.addEventListener("error", handleError);
    };

    connect();

    return () => {
      if (currentEventSource) {
        currentEventSource.removeEventListener("message", handleMessage);
        currentEventSource.removeEventListener("error", handleError);
        currentEventSource.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [orgId, isAuthenticated]);

  const getUpdate = (id: string) => updates[id];

  return { getUpdate, updates };
}

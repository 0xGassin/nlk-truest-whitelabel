import type { ServerResponse } from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

export interface CTFinding {
  certificate: { first_seen_at: string; issuer: string };
  id: string;
  match_type: string;
  matched_san: string;
  observations?: { log_name?: string; log_source: string; observed_at?: string }[] | null;
  reviewed: boolean;
}

function ctMatchesPath(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/ct-matches`;
}

export async function listCTFindings(organizationId: string, domainId: string, cacheBust?: number): Promise<CTFinding[]> {
  const response = await apiClient.get<ServerResponse<{ findings: CTFinding[] }>>(ctMatchesPath(organizationId), {
    params: {
      limit: 500,
      watched_domain_id: domainId,
      ...(cacheBust === undefined ? {} : { _refresh: cacheBust }),
    },
  });
  return ensureData(response.data.data, "Failed to load CT logs").findings ?? [];
}

export async function setCTFindingReviewed(organizationId: string, findingId: string, reviewed: boolean): Promise<void> {
  await apiClient.patch(`${ctMatchesPath(organizationId)}/${findingId}`, { reviewed });
}

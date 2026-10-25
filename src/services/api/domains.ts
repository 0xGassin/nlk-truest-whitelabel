import type {
  AddDomainResponse,
  DomainListResponse,
  DomainLookalike,
  DomainSubdomain,
  DomainVerification,
  OrganizationManualRescanUsage,
  ServerResponse,
  WatchedDomain,
} from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

const domainsPath = (organizationId: string, suffix = "") => `/api/v1/organizations/${organizationId}/domains${suffix}`;

export const listDomains = async (organizationId: string): Promise<WatchedDomain[]> => {
  const response = await apiClient.get<ServerResponse<DomainListResponse>>(domainsPath(organizationId));
  return ensureData(response.data.data, "Failed to load domains").domains ?? [];
};

export const addDomain = async (organizationId: string, rootDomain: string): Promise<AddDomainResponse> => {
  const response = await apiClient.post<ServerResponse<AddDomainResponse>>(domainsPath(organizationId), {
    root_domain: rootDomain,
  });
  return ensureData(response.data.data, "Failed to add domain");
};

export const verifyDomain = async (organizationId: string, domainId: string): Promise<WatchedDomain> => {
  const response = await apiClient.post<ServerResponse<{ domain: WatchedDomain }>>(
    domainsPath(organizationId, `/${domainId}/verify`),
  );
  return ensureData(response.data.data, "Failed to verify domain").domain;
};

export const rescanDomain = async (
  organizationId: string,
  domainId: string,
): Promise<{ manual_rescans: OrganizationManualRescanUsage; queued: number }> => {
  const response = await apiClient.post<
    ServerResponse<{ manual_rescans: OrganizationManualRescanUsage; queued: number }>
  >(domainsPath(organizationId, `/${domainId}/rescan`));
  return ensureData(response.data.data, "Failed to start rescan");
};

export const updateDomainScanSettings = async (
  organizationId: string,
  domainId: string,
  activeScanEnabled: boolean,
): Promise<WatchedDomain> => {
  const response = await apiClient.patch<ServerResponse<{ domain: WatchedDomain }>>(
    domainsPath(organizationId, `/${domainId}/scan-settings`),
    { active_scan_enabled: activeScanEnabled },
  );
  return ensureData(response.data.data, "Failed to update scan settings").domain;
};

export const startDomainCrawler = async (organizationId: string, domainId: string): Promise<boolean> => {
  const response = await apiClient.post<ServerResponse<{ queued: boolean }>>(
    domainsPath(organizationId, `/${domainId}/crawler/run`),
  );
  return ensureData(response.data.data, "Failed to start crawler").queued;
};

export const rotateVerificationToken = async (
  organizationId: string,
  domainId: string,
): Promise<{ domain: WatchedDomain; verification: DomainVerification }> => {
  const response = await apiClient.post<ServerResponse<{ domain: WatchedDomain; verification: DomainVerification }>>(
    domainsPath(organizationId, `/${domainId}/verification-token`),
  );
  return ensureData(response.data.data, "Failed to create a verification record");
};

export const deleteDomain = async (organizationId: string, domainId: string): Promise<void> => {
  await apiClient.delete(domainsPath(organizationId, `/${domainId}`));
};

export const generateDomainExposureReport = async (organizationId: string, domainId: string): Promise<Blob> => {
  const response = await apiClient.get<Blob>(domainsPath(organizationId, `/${domainId}/reports/exposure`), {
    responseType: "blob",
  });
  return response.data;
};

export const listSubdomains = async (organizationId: string, domainId: string): Promise<string[]> => {
  const response = await apiClient.get<ServerResponse<{ subdomains: string[] }>>(
    domainsPath(organizationId, `/${domainId}/subdomains`),
  );
  return ensureData(response.data.data, "Failed to load subdomains").subdomains ?? [];
};

export const listSubdomainDetails = async (organizationId: string, domainId: string): Promise<DomainSubdomain[]> => {
  const response = await apiClient.get<ServerResponse<{ subdomains: DomainSubdomain[] }>>(
    domainsPath(organizationId, `/${domainId}/subdomain-details`),
  );
  return ensureData(response.data.data, "Failed to load subdomain details").subdomains ?? [];
};

export interface DomainEmail {
  attrs: Record<string, unknown> | null;
  email: string;
  first_seen_at: string;
  last_seen_at: string;
  source: string;
}

export const listEmails = async (organizationId: string, domainId: string): Promise<DomainEmail[]> => {
  const response = await apiClient.get<ServerResponse<{ emails: DomainEmail[] }>>(
    domainsPath(organizationId, `/${domainId}/emails`),
  );
  return ensureData(response.data.data, "Failed to load emails").emails ?? [];
};

export interface DomainDNSRecords {
  a: string[];
  aaaa: string[];
  cname: string[];
  mx: string[];
  ns: string[];
  txt: string[];
  verification_name: string;
  verification_records: string[];
}

export const lookupDomainDNS = async (organizationId: string, domainId: string): Promise<DomainDNSRecords> => {
  const response = await apiClient.get<ServerResponse<{ dns: DomainDNSRecords }>>(
    domainsPath(organizationId, `/${domainId}/dns`),
  );
  return ensureData(response.data.data, "Failed to look up DNS records").dns;
};

export interface DomainNetworkAsset {
  attrs: Record<string, unknown> | null;
  source: string;
  type: string;
  value: string;
}

export interface DomainAsset extends DomainNetworkAsset {
  domain_id: string;
  first_seen_at: string;
  id: string;
  last_seen_at: string;
  removed_at?: string | null;
}

export const listDomainNetworkAssets = async (
  organizationId: string,
  domainId: string,
): Promise<DomainNetworkAsset[]> => {
  const response = await apiClient.get<ServerResponse<{ assets: DomainNetworkAsset[] }>>(
    domainsPath(organizationId, `/${domainId}/network-assets`),
  );
  return ensureData(response.data.data, "Failed to load network enrichment").assets ?? [];
};

export const listDomainAssets = async (
  organizationId: string,
  domainId: string,
  { includeRemoved = false, cacheBust }: { includeRemoved?: boolean; cacheBust?: number } = {},
): Promise<DomainAsset[]> => {
  const assets: DomainAsset[] = [];
  const pageSize = 5000;
  let offset = 0;
  while (true) {
    const response = await apiClient.get<ServerResponse<{ assets: DomainAsset[] }>>(
      domainsPath(organizationId, `/${domainId}/assets`),
      {
        params: {
          include_removed: includeRemoved,
          limit: pageSize,
          offset,
          ...(cacheBust === undefined ? {} : { _refresh: cacheBust }),
        },
      },
    );
    const page = ensureData(response.data.data, "Failed to load asset inventory").assets ?? [];
    assets.push(...page);
    if (page.length < pageSize) return assets;
    offset += page.length;
  }
};

export interface DomainMetrics {
  assets: number;
  findings: number;
  previous_assets: number;
  previous_findings: number;
}

export const getDomainMetrics = async (
  organizationId: string,
  domainId: string,
  previousBoundary: Date,
  cacheBust?: number,
): Promise<DomainMetrics> => {
  const response = await apiClient.get<ServerResponse<DomainMetrics>>(
    domainsPath(organizationId, `/${domainId}/metrics`),
    {
      params: {
        previous_boundary: previousBoundary.toISOString(),
        ...(cacheBust === undefined ? {} : { _refresh: cacheBust }),
      },
    },
  );
  return ensureData(response.data.data, "Failed to load domain metrics");
};

export interface AssetMapPoint {
  asn?: string;
  city?: string;
  country?: string;
  country_code?: string;
  domain_id: string;
  findings: number;
  hostnames?: string[];
  ip: string;
  lat: number;
  lon: number;
  org?: string;
  root_domain: string;
}

export const listAssetMapPoints = async (organizationId: string): Promise<AssetMapPoint[]> => {
  const response = await apiClient.get<ServerResponse<{ points: AssetMapPoint[] }>>(
    `/api/v1/organizations/${organizationId}/assets/map`,
  );
  return ensureData(response.data.data, "Failed to load asset map").points ?? [];
};

export interface OrganizationFinding {
  asset_type?: string;
  asset_value?: string;
  details: Record<string, unknown> | null;
  domain_id: string;
  first_seen_at: string;
  id: string;
  last_seen_at: string;
  opened_at?: string | null;
  module: string;
  remediation?: string;
  resolved_at?: string | null;
  reviewed_at?: string | null;
  root_domain?: string;
  severity: string;
  status: "open" | "resolved" | "reviewed" | string;
  title: string;
  type: string;
}

export interface OrganizationFindingsResponse {
  findings: OrganizationFinding[];
  limit: number;
  offset: number;
  total: number;
}

export interface FindingQuery {
  /** Forces live dashboard reads through browser/proxy caches. */
  cacheBust?: number;
  limit?: number;
  module?: string;
  offset?: number;
  search?: string;
  severity?: string[];
  status?: string;
  type?: string;
}

export const listOrganizationFindings = async (
  organizationId: string,
  query: FindingQuery = {},
): Promise<OrganizationFindingsResponse> => {
  const response = await apiClient.get<ServerResponse<OrganizationFindingsResponse>>(
    `/api/v1/organizations/${organizationId}/findings`,
    {
      params: {
        ...query,
        _refresh: query.cacheBust,
        cacheBust: undefined,
        severity: query.severity?.join(","),
      },
    },
  );
  return ensureData(response.data.data, "Failed to load findings");
};

export const listDomainFindings = async (
  organizationId: string,
  domainId: string,
  query: FindingQuery = {},
): Promise<OrganizationFindingsResponse> => {
  const response = await apiClient.get<ServerResponse<OrganizationFindingsResponse>>(
    domainsPath(organizationId, `/${domainId}/findings`),
    {
      params: {
        ...query,
        _refresh: query.cacheBust,
        cacheBust: undefined,
        severity: query.severity?.join(","),
      },
    },
  );
  return ensureData(response.data.data, "Failed to load domain findings");
};

const FINDINGS_PAGE_SIZE = 1000;

async function listAllFindings(
  getPage: (offset: number) => Promise<OrganizationFindingsResponse>,
): Promise<OrganizationFindingsResponse> {
  const findings: OrganizationFinding[] = [];
  let offset = 0;
  let total = 0;

  while (true) {
    const page = await getPage(offset);
    findings.push(...page.findings);
    total = page.total;
    if (page.findings.length === 0 || findings.length >= total) {
      return { findings, limit: FINDINGS_PAGE_SIZE, offset: 0, total };
    }
    offset += page.findings.length;
  }
}

export const listAllOrganizationFindings = async (
  organizationId: string,
  query: FindingQuery = {},
): Promise<OrganizationFindingsResponse> =>
  listAllFindings((offset) =>
    listOrganizationFindings(organizationId, { ...query, limit: FINDINGS_PAGE_SIZE, offset }),
  );

export const listAllDomainFindings = async (
  organizationId: string,
  domainId: string,
  query: FindingQuery = {},
): Promise<OrganizationFindingsResponse> =>
  listAllFindings((offset) =>
    listDomainFindings(organizationId, domainId, { ...query, limit: FINDINGS_PAGE_SIZE, offset }),
  );

export interface FindingSummary {
  by_module: { count: number; module: string }[];
  by_severity: { count: number; severity: string }[];
  total: number;
}

export const getFindingSummary = async (organizationId: string): Promise<FindingSummary> => {
  const response = await apiClient.get<ServerResponse<FindingSummary>>(
    `/api/v1/organizations/${organizationId}/findings/summary`,
  );
  return ensureData(response.data.data, "Failed to load finding summary");
};

export const updateOrganizationFindingStatus = async (
  organizationId: string,
  domainId: string,
  findingId: string,
  status: "open" | "reviewed",
): Promise<void> => {
  await apiClient.patch(`/api/v1/organizations/${organizationId}/domains/${domainId}/findings/${findingId}`, {
    status,
  });
};

export interface DomainScanJob {
  attempts: number;
  created_at: string;
  last_error?: string;
  last_run_at?: string;
  module: string;
  next_run_at: string;
  status: string;
}

export const listDomainScans = async (organizationId: string, domainId: string): Promise<DomainScanJob[]> => {
  const response = await apiClient.get<ServerResponse<{ scans: DomainScanJob[] }>>(
    domainsPath(organizationId, `/${domainId}/scans`),
  );
  return ensureData(response.data.data, "Failed to load scan status").scans ?? [];
};

export interface DomainCrawlerFinding {
  details: Record<string, unknown> | null;
  first_seen_at: string;
  id: string;
  last_seen_at: string;
  remediation?: string;
  resolved_at?: string | null;
  severity: string;
  status: string;
  title: string;
  type: string;
}

export const listDomainCrawlerFindings = async (
  organizationId: string,
  domainId: string,
): Promise<DomainCrawlerFinding[]> => {
  const response = await apiClient.get<ServerResponse<{ findings: DomainCrawlerFinding[]; total: number }>>(
    domainsPath(organizationId, `/${domainId}/crawler-findings`),
    { params: { limit: 500 } },
  );
  return ensureData(response.data.data, "Failed to load crawler findings").findings ?? [];
};

export const listDomainTechnologyFindings = async (
  organizationId: string,
  domainId: string,
): Promise<DomainCrawlerFinding[]> => {
  const response = await apiClient.get<ServerResponse<{ findings: DomainCrawlerFinding[]; total: number }>>(
    domainsPath(organizationId, `/${domainId}/crawler-findings`),
    { params: { limit: 500, type: "technology" } },
  );
  return ensureData(response.data.data, "Failed to load web technology findings").findings ?? [];
};

export const listLookalikes = async (organizationId: string, domainId: string): Promise<DomainLookalike[]> => {
  const lookalikes: DomainLookalike[] = [];
  const pageSize = 500;
  let offset = 0;
  while (true) {
    const response = await apiClient.get<ServerResponse<{ lookalikes: DomainLookalike[] }>>(
      domainsPath(organizationId, `/${domainId}/lookalikes`),
      { params: { limit: pageSize, offset } },
    );
    const page = ensureData(response.data.data, "Failed to load lookalikes").lookalikes ?? [];
    lookalikes.push(...page);
    if (page.length < pageSize) return lookalikes;
    offset += page.length;
  }
};

export const updateLookalike = async (
  organizationId: string,
  domainId: string,
  lookalikeId: string,
  update: { reviewed?: boolean },
): Promise<void> => {
  await apiClient.patch(domainsPath(organizationId, `/${domainId}/lookalikes/${lookalikeId}`), update);
};

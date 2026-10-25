export interface DomainVerification {
  expires_at: string;
  record_name: string;
  record_type: "TXT";
  record_value: string;
}

export interface WatchedDomain {
  active: boolean;
  active_scan_enabled: boolean;
  id: string;
  permutations: string[];
  root_domain: string;
  user_id: string;
  verified_at?: string;
}

export interface AddDomainResponse {
  domain: WatchedDomain;
  verification: DomainVerification;
}

export interface DomainListResponse {
  domains: WatchedDomain[];
}

export interface DomainLookalike {
  details?: Record<string, unknown>;
  first_seen_at: string;
  id: string;
  last_seen_at: string;
  remediation?: string;
  resolved_at?: string;
  reviewed_at?: string;
  severity: string;
  status: string;
  title: string;
}

export interface DomainSubdomainFinding {
  details?: Record<string, unknown>;
  first_seen_at: string;
  id: string;
  last_seen_at: string;
  remediation?: string;
  resolved_at?: string;
  severity: string;
  status: string;
  title: string;
  type: string;
}

export interface DomainSubdomain {
  attrs?: Record<string, unknown>;
  domain_id: string;
  findings: DomainSubdomainFinding[];
  first_seen_at: string;
  id: string;
  last_seen_at: string;
  source: string;
  type: "subdomain";
  value: string;
}

/** Resource tag map with string values */
export type ResourceTags = Record<string, string>;

/** Resource metadata with typed common fields */
export interface ResourceMetadata {
  [key: string]: boolean | number | string | undefined;
  account_id?: string;
  provider?: string;
  service?: string;
  state?: string;
}

/** Correlation metadata for resource changes */
export interface CorrelationMetadata {
  [key: string]: boolean | number | string | undefined;
  correlation_type?: string;
  matched_by?: string;
  source_file?: string;
}

export interface CloudResource {
  arn?: string;
  connection_id?: string;
  discovered_at?: string;
  id: string;
  is_default?: boolean;
  last_seen_at?: string;
  metadata?: ResourceMetadata;
  name?: string;
  organization_id?: string;
  region: string;
  resource_id: string;
  resource_name?: string;
  resource_type: string;
  source_commit_sha?: string;

  source_default_branch?: string;
  source_file_path?: string;
  source_line_number?: number;
  source_repo_id?: string;
  source_repo_name?: string;
  // IaC Source Attribution
  source_type?: "iac" | "manual" | "unknown";
  tags?: ResourceTags;
}

export interface CloudResourcesResponse {
  resources: CloudResource[];
  total_count: number;
}

export interface ResourceChange {
  change_type: string;
  cloudtrail_event_id?: string;
  cloudtrail_event_time?: string;
  confidence_score?: number;
  correlation_metadata?: CorrelationMetadata;
  created_at: string;
  github_event_id?: string;
  id: string;
  resource_id: string;
}

/** History item data for change events */
export interface ChangeHistoryData {
  cloudtrail_event_id?: string;
  cloudtrail_event_time?: string;
  confidence_score?: number;
}

/** History item data for commit events */
export interface CommitHistoryData {
  additions?: number;
  deletions?: number;
  files_changed?: string[];
}

/** Union type for history item data */
export type HistoryItemData = ChangeHistoryData | CommitHistoryData;

/** Unified history item from the enhanced history endpoint */
export interface HistoryItem {
  author?: string;
  branch?: string;
  change_type?: string;
  commit_message?: string;
  commit_sha?: string;
  data?: HistoryItemData;
  patch?: string;
  timestamp: string;
  type: "change" | "commit";
}

// ---------- Drift detection ----------

export type DriftKind = "changed" | "manual_change" | "missing" | "orphaned" | "undeclared";

export type DriftSeverity = "high" | "low" | "medium";

/** A single drift finding: a difference between what IaC declares and live state */
export interface DriftEntry {
  actual_value?: unknown;
  attribute?: string;
  cloud_provider?: string;
  declared_value?: unknown;
  detected_at: string;
  kind: DriftKind;
  region?: string;
  resource_arn?: string;
  resource_id?: string;
  resource_name: string;
  resource_type: string;
  severity: DriftSeverity;
  source_file_path?: string;
  source_repo_id?: string;
}

/** Full result of a drift detection run for a connection */
export interface DriftReport {
  connection_id: string;
  drifted_count: number;
  entries: DriftEntry[];
  generated_at: string;
  high_count: number;
  low_count: number;
  medium_count: number;
  missing_count: number;
  orphaned_count: number;
  total_managed: number;
}

// ---------- Org-wide context layer ----------

/** One connection's contribution to the org-wide context view */
export interface OrgContextConnection {
  account_id: string;
  connection_id: string;
  connection_name: string;
  provider: string;
  region: string;
  resource_count: number;
}

/** Org-wide rollup over every connection's context layer */
export interface OrgContextSummary {
  connections: OrgContextConnection[];
  iac_managed_count: number;
  manual_count: number;
  resources_by_provider: Record<string, number>;
  resources_by_region: Record<string, number>;
  resources_by_type: Record<string, number>;
  total_resources: number;
}

/** A single dependency found while walking the relationship graph */
export interface ImpactNode {
  arn: string;
  hops: number;
  metadata?: Record<string, unknown>;
  region?: string;
  relationship_type: string;
  resource_name?: string;
  resource_type?: string;
}

/** Upstream/downstream dependency analysis for a resource */
export interface ImpactAnalysis {
  direct_dependents: number;
  downstream: ImpactNode[];
  resource_arn: string;
  resource_name?: string;
  resource_type?: string;
  transitive_dependents: number;
  upstream: ImpactNode[];
}

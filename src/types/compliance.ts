export interface ComplianceFramework {
  name: string;
  version?: string;
}

export interface ComplianceControl {
  category: string;
  check_category?: null | string;
  check_id?: null | string;
  check_title?: null | string;
  connection_id: string;
  contextual_description?: string;
  created_at?: string;
  description: string;
  framework: string;
  id: string;
  region?: string;
  resource?: string;
  scan_id: string;
  status: "FAIL" | "MANUAL" | "PASS";
  updated_at?: string;
}

export interface ComplianceResponse {
  count: number;
  findings: ComplianceControl[];
}

export interface FrameworksResponse {
  count: number;
  frameworks: string[];
}

export interface ScanResponse {
  connection_id?: string;
  message?: string;
  status?: string;
}

import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import type { SecurityIssue } from "@/services/api/integration";

import { useMemo, useState } from "react";

import { createFilter } from "@/components/ui/filters";

export type IssueView = "active" | "all" | "ignored" | "solved";

export interface UseIssueFiltersResult {
  activeCount: number;
  fields: FilterFieldConfig[];
  filteredIssues: SecurityIssue[];
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
  view: IssueView;
}

const selectOperators = [
  { label: "is", value: "is" },
  { label: "is not", value: "is_not" },
];

export function useIssueFilters(issues: SecurityIssue[]) {
  const [filters, setFilters] = useState<Filter[]>(() => [createFilter("status", "is", ["active"])]);

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "status",
        label: "Status",
        operators: selectOperators,
        options: [
          { label: "Active Findings", value: "active" },
          { label: "Solved Findings", value: "solved" },
          { label: "Ignored Findings", value: "ignored" },
        ],
        type: "select",
      },
      {
        key: "severity",
        label: "Severity",
        operators: selectOperators,
        options: [
          { label: "Critical", value: "critical" },
          { label: "High", value: "high" },
          { label: "Medium", value: "medium" },
          { label: "Low", value: "low" },
        ],
        type: "select",
      },
      {
        key: "issueType",
        label: "Issue Type",
        operators: selectOperators,
        options: [
          { label: "Infrastructure as Code", value: "iac" },
          { label: "SAST", value: "sast" },
          { label: "Vulnerable Dependencies", value: "dependencies" },
        ],
        type: "select",
      },
    ],
    [],
  );

  // Filter active issues
  const filteredIssues = useMemo(() => {
    if (filters.length === 0) return issues;
    return issues.filter((issue) => {
      return filters.every((filter) => {
        const value = typeof filter.values[0] === "string" ? filter.values[0] : "";
        if (filter.field === "severity") {
          const matches = issue.severity.toLowerCase() === value.toLowerCase();
          return filter.operator === "is_not" ? !matches : matches;
        }
        if (filter.field === "issueType") {
          const matches =
            value === "iac" ? (!issue.issue_type || issue.issue_type === "iac") : issue.issue_type === value;
          return filter.operator === "is_not" ? !matches : matches;
        }
        if (filter.field === "status") {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          const status = (issue.status || issue.triage_status || "active").toLowerCase();
          const matches = status === value;
          return filter.operator === "is_not" ? !matches : matches;
        }
        return true;
      });
    });
  }, [issues, filters]);

  const activeCount = useMemo(() => {
    return issues.filter((issue) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      return (issue.status || issue.triage_status || "active").toLowerCase() === "active";
    }).length;
  }, [issues]);

  const view: IssueView = useMemo(() => {
    const statusValue = filters.find((filter) => filter.field === "status")?.values[0];
    if (statusValue === "all") return "all";
    if (statusValue === "solved") return "solved";
    if (statusValue === "ignored") return "ignored";
    return "active";
  }, [filters]);

  return {
    activeCount,
    fields,
    filteredIssues,
    filters,
    setFilters,
    view,
  };
}

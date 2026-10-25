import { describe, expect, it } from "vitest";

import {
  buildOpenFindingTrend,
  countAssetsAtPreviousDay,
  countOpenFindingsAtPreviousDay,
  getOpenFindings,
  parseMetricDate,
} from "./finding-metrics";

describe("finding metrics", () => {
  const now = new Date(2026, 0, 10, 12);
  const findings = [
    { first_seen_at: "2025-12-20T12:00:00Z", status: "open" },
    { first_seen_at: "2026-01-03T12:00:00Z", status: "open" },
    { first_seen_at: "2026-01-09T12:00:00Z", status: "open" },
    { first_seen_at: "2026-01-10T08:00:00Z", status: "open" },
    { first_seen_at: "2026-01-03T13:00:00Z", status: "open" },
    { first_seen_at: "2026-01-05T12:00:00Z", resolved_at: "2026-01-10T08:00:00Z", status: "resolved" },
    { first_seen_at: "2026-01-08T12:00:00Z", status: "reviewed" },
    { first_seen_at: "2026-01-07T12:00:00Z", status: "resolved" },
  ];

  it("uses the same exact open status as the Overview default", () => {
    expect(getOpenFindings(findings)).toEqual(findings.slice(0, 5));
  });

  it("uses complete-day open snapshots for the findings line", () => {
    const trend = buildOpenFindingTrend(findings, { now });

    expect(trend.openCount).toBe(5);
    expect(trend.previousDayOpenCount).toBe(5);
    expect(trend.cumulativeCounts.at(-1)).toBe(trend.previousDayOpenCount);
    expect(trend.cumulativeCounts).toEqual([3, 4, 4, 4, 4, 5, 5]);
    expect(trend.dailyCounts).toEqual([0, 1, 0, 0, 0, 1, 1]);
  });

  it("uses local midnight and excludes resolved findings with unusable timestamps", () => {
    expect(parseMetricDate("2026-01-10").getDate()).toBe(10);
    expect(
      countOpenFindingsAtPreviousDay(
        [
          { first_seen_at: new Date(2026, 0, 9, 23, 59).toISOString(), status: "open" },
          {
            first_seen_at: new Date(2026, 0, 8, 12).toISOString(),
            resolved_at: new Date(2026, 0, 10).toISOString(),
            status: "resolved",
          },
          { first_seen_at: "2026-01-08T12:00:00Z", resolved_at: "not-a-date", status: "resolved" },
          { first_seen_at: new Date(2026, 0, 10, 0, 1).toISOString(), status: "open" },
        ],
        now,
      ),
    ).toBe(2);
  });

  it("keeps a finding reviewed today in yesterday's strictly-open baseline", () => {
    const trend = buildOpenFindingTrend(
      [
        { first_seen_at: "2026-01-08T12:00:00Z", reviewed_at: "2026-01-10T08:00:00Z", status: "reviewed" },
        { first_seen_at: "2026-01-08T12:00:00Z", reviewed_at: "2026-01-09T08:00:00Z", status: "reviewed" },
      ],
      { now },
    );

    expect(trend.openCount).toBe(0);
    expect(trend.previousDayOpenCount).toBe(1);
    expect(trend.cumulativeCounts.at(-1)).toBe(0);
  });

  it("does not count a finding reopened today as open yesterday", () => {
    expect(
      countOpenFindingsAtPreviousDay(
        [
          {
            first_seen_at: "2026-01-08T12:00:00Z",
            opened_at: "2026-01-10T08:00:00Z",
            status: "open",
          },
        ],
        now,
      ),
    ).toBe(0);
  });

  it("counts the asset baseline strictly before local midnight", () => {
    expect(
      countAssetsAtPreviousDay(
        [
          { first_seen_at: new Date(2026, 0, 9, 23, 59).toISOString() },
          { first_seen_at: new Date(2026, 0, 10, 0, 1).toISOString() },
          {
            first_seen_at: new Date(2026, 0, 8).toISOString(),
            removed_at: new Date(2026, 0, 10, 0, 1).toISOString(),
          },
          { first_seen_at: "not-a-date" },
        ],
        now,
      ),
    ).toBe(2);
  });
});

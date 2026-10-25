export type FindingMetricRecord = {
  first_seen_at: string;
  opened_at?: string | null;
  resolved_at?: string | null;
	/** Set when an active finding moves out of the strictly-open Overview. */
  reviewed_at?: string | null;
  status: string;
};

export type OpenFindingTrend = {
  cumulativeCounts: number[];
  dailyCounts: number[];
  openCount: number;
  previousDayOpenCount: number;
};

/** Parses API timestamps without letting date-only values shift across timezones. */
export function parseMetricDate(value: string | null | undefined): Date {
  const raw = value?.trim() ?? "";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  return new Date(raw);
}

export function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function calendarDayOffset(value: Date, start: Date): number {
  const valueDay = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round((valueDay - startDay) / 86_400_000);
}

export function isOpenFinding(finding: Pick<FindingMetricRecord, "status">): boolean {
  return (
    String(finding.status ?? "")
      .trim()
      .toLowerCase() === "open"
  );
}

export function getOpenFindings<T extends FindingMetricRecord>(findings: T[]): T[] {
  return findings.filter(isOpenFinding);
}

/** Counts findings that were active at the start of today (the end of yesterday). */
export function countOpenFindingsAtPreviousDay(findings: FindingMetricRecord[], now: Date): number {
  const todayStart = startOfLocalDay(now);
  return findings.filter((finding) => wasOpenAt(finding, todayStart)).length;
}

/** Counts assets that already existed at the start of the current local day. */
export function countAssetsAtPreviousDay<T extends { first_seen_at: string; removed_at?: string | null }>(
  assets: T[],
  now: Date,
): number {
  const todayStart = startOfLocalDay(now);
  return assets.filter((asset) => {
    const firstSeen = parseMetricDate(asset.first_seen_at);
    if (Number.isNaN(firstSeen.getTime()) || firstSeen >= todayStart) return false;
    const removedAt = parseMetricDate(asset.removed_at);
    return Number.isNaN(removedAt.getTime()) || removedAt >= todayStart;
  }).length;
}

function isTrackableFinding(finding: FindingMetricRecord): boolean {
  const status = String(finding.status ?? "")
    .trim()
    .toLowerCase();
  if (status === "open") return true;
  if (status === "resolved") return Boolean(finding.resolved_at);
  return status === "reviewed" && Boolean(finding.reviewed_at);
}

function wasOpenAt(finding: FindingMetricRecord, boundary: Date): boolean {
  const firstSeen = parseMetricDate(finding.first_seen_at);
  if (Number.isNaN(firstSeen.getTime()) || firstSeen >= boundary || !isTrackableFinding(finding)) return false;
  if (String(finding.status ?? "").trim().toLowerCase() === "open") {
    const openedAt = parseMetricDate(finding.opened_at ?? finding.first_seen_at);
    return !Number.isNaN(openedAt.getTime()) && openedAt < boundary;
  }

  if (String(finding.status ?? "").trim().toLowerCase() === "reviewed") {
    const reviewedAt = parseMetricDate(finding.reviewed_at);
    return !Number.isNaN(reviewedAt.getTime()) && reviewedAt >= boundary;
  }

  const resolvedAt = parseMetricDate(finding.resolved_at);
  return !Number.isNaN(resolvedAt.getTime()) && resolvedAt >= boundary;
}

/**
 * Builds an end-of-day, browser-local-day series for the last complete period
 * from the exact status set the Overview uses by default: `open` findings.
 * Resolved and reviewed findings are included in earlier snapshots until their
 * transition timestamp, so the line does not silently undercount historical
 * days while its current total stays strictly open.
 */
export function buildOpenFindingTrend(
  findings: FindingMetricRecord[],
  { days = 7, now = new Date() }: { days?: number; now?: Date } = {},
): OpenFindingTrend {
  const openFindings = getOpenFindings(findings);
  const periodDays = Math.max(1, Math.floor(days));
  const today = startOfLocalDay(now);
  const start = new Date(today);
  // Include today as the final point so the chart reflects discoveries and
  // open findings arriving during the current local day.
  start.setDate(start.getDate() - (periodDays - 1));

  const dailyCounts = Array.from({ length: periodDays }, () => 0);
  const previousDayOpenCount = countOpenFindingsAtPreviousDay(findings, today);

  for (const finding of findings) {
    const firstSeen = parseMetricDate(finding.first_seen_at);
    if (!isTrackableFinding(finding) || Number.isNaN(firstSeen.getTime())) continue;
    const dayOffset = calendarDayOffset(firstSeen, start);
    if (dayOffset >= 0 && dayOffset < periodDays) dailyCounts[dayOffset] += 1;
  }

  const cumulativeCounts = buildDayList(periodDays, start).map((day) => {
    const isToday = calendarDayOffset(day, today) === 0;
    // Include records created at the exact refresh instant in the live point.
    const snapshotBoundary = isToday ? new Date(now.getTime() + 1) : new Date(day);
    if (!isToday) snapshotBoundary.setDate(snapshotBoundary.getDate() + 1);
    return findings.filter((finding) => wasOpenAt(finding, snapshotBoundary)).length;
  });

  return {
    cumulativeCounts,
    dailyCounts,
    openCount: openFindings.length,
    previousDayOpenCount,
  };
}

function buildDayList(count: number, start: Date): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

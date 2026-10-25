import { format, startOfDay, subDays } from "date-fns";

export interface HasCreatedAt {
  created_at?: null | string;
}

export interface IssuesTrendPoint {
  date: string;
  issues: number;
  label: string;
}

export function buildIssuesOverTimeTrend(items: HasCreatedAt[], days = 30): IssuesTrendPoint[] {
  const today = startOfDay(new Date());
  const points: IssuesTrendPoint[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const day = startOfDay(subDays(today, days - 1 - offset));
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const count = items.filter((item) => {
      if (!item.created_at) return false;
      return new Date(item.created_at).getTime() <= dayEnd.getTime();
    }).length;

    points.push({
      date: format(day, "yyyy-MM-dd"),
      issues: count,
      label: format(day, "MMM d"),
    });
  }

  return points;
}

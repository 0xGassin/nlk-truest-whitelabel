"use client";

import { Eye, EyeOff } from "lucide-react";

import { formatDetailLabel } from "@/lib/detail-label";

export interface DiscoveryBreach {
  dataClasses?: string[];
  date?: string;
  description?: string;
  domain?: string;
  name: string;
}

export function firstString(object: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  return values.length > 0 ? values : undefined;
}

export function parseBreach(value: unknown): DiscoveryBreach | null {
  if (typeof value === "string" && value.trim()) return { name: value.trim() };
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const object = value as Record<string, unknown>;
  const name = firstString(object, ["name", "title", "breach", "source", "database_name"]);
  if (!name) return null;

  return {
    dataClasses: stringArray(object.data_classes ?? object.dataClasses),
    date: firstString(object, ["breach_date", "breachDate", "date", "added_date", "addedDate"]),
    description: firstString(object, ["description", "details", "explanation"]),
    domain: firstString(object, ["domain"]),
    name,
  };
}

export function parseBreaches(value: unknown): DiscoveryBreach[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseBreach).filter((item): item is DiscoveryBreach => item !== null);
}

export function mergeBreaches(...groups: DiscoveryBreach[][]): DiscoveryBreach[] {
  const merged = new Map<string, DiscoveryBreach>();
  for (const group of groups) {
    for (const breach of group) {
      const key = breach.name.toLowerCase();
      const current = merged.get(key);
      merged.set(key, {
        dataClasses: current?.dataClasses ?? breach.dataClasses,
        date: current?.date ?? breach.date,
        description: current?.description ?? breach.description,
        domain: current?.domain ?? breach.domain,
        name: current?.name ?? breach.name,
      });
    }
  }
  return [...merged.values()];
}

export function emailBreaches(attrs: Record<string, unknown> | null | undefined): DiscoveryBreach[] {
  return mergeBreaches(parseBreaches(attrs?.breaches), parseBreaches(attrs?.breach_details));
}

export function findingBreaches(details: Record<string, unknown> | null | undefined): DiscoveryBreach[] {
  return mergeBreaches(parseBreaches(details?.breaches), parseBreaches(details?.breach_details));
}

export function findingCredentials(details: Record<string, unknown> | null | undefined): Record<string, unknown>[] {
  return Array.isArray(details?.credentials)
    ? details.credentials.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

export function findingCount(details: Record<string, unknown> | null | undefined, key: string): number {
  const value = details?.[key];
  return typeof value === "number" ? value : 0;
}

export function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(formatDetailValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${formatDetailLabel(key)}: ${formatDetailValue(item)}`)
      .join(", ");
  }
  return String(value);
}

export function explainBreach(
  breach: DiscoveryBreach,
  breaches: DiscoveryBreach[],
  credentials: Record<string, unknown>[],
): string {
  const relatedCredentials = credentials.filter(
    (credential) =>
      String(credential.source ?? "")
        .trim()
        .toLowerCase() === breach.name.trim().toLowerCase(),
  );
  const plaintextCount = relatedCredentials.filter((credential) => {
    const password = credential.password;
    return typeof password === "string" && password.length > 0;
  }).length;
  const hashCount = relatedCredentials.filter((credential) => {
    const hash = credential.hash;
    return typeof hash === "string" && hash.length > 0;
  }).length;

  if (plaintextCount > 0 || hashCount > 0) {
    const exposedFields = [
      plaintextCount > 0 ? `${plaintextCount} plaintext password${plaintextCount === 1 ? "" : "s"}` : null,
      hashCount > 0 ? `${hashCount} password hash${hashCount === 1 ? "" : "es"}` : null,
    ].filter((value): value is string => value !== null);
    return `This breach returned ${exposedFields.join(" and ")}.`;
  }

  if (breaches.length === 1 && credentials.length > 0) {
    return "The email was found in this breach with credential data, but no password or hash was returned.";
  }

  return "The email was found in this breach, but no password or password hash was returned.";
}

export function formatBreachDate(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function formatBreachStepDate(value?: string): { day: string; month: string } | undefined {
  if (!value || /^\d{4}$/.test(value)) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const parts = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(date);

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
  };
}

export function credentialsForBreach(
  breach: DiscoveryBreach,
  breaches: DiscoveryBreach[],
  credentials: Record<string, unknown>[],
): Record<string, unknown>[] {
  const related = credentials.filter(
    (credential) =>
      String(credential.source ?? "")
        .trim()
        .toLowerCase() === breach.name.trim().toLowerCase(),
  );
  if (related.length > 0) return related;
  if (breaches.length !== 1) return [];
  return credentials.filter((credential) => !String(credential.source ?? "").trim());
}

export function credentialsNotMappedToBreaches(
  breaches: DiscoveryBreach[],
  credentials: Record<string, unknown>[],
): Record<string, unknown>[] {
  const mapped = new Set(breaches.flatMap((breach) => credentialsForBreach(breach, breaches, credentials)));
  return credentials.filter((credential) => !mapped.has(credential));
}

export function CredentialFields({
  credentials,
  fieldPrefix,
  isRevealed,
  onTogglePassword,
}: {
  credentials: Record<string, unknown>[];
  fieldPrefix: string;
  isRevealed: (fieldId: string) => boolean;
  onTogglePassword: (fieldId: string) => void;
}) {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {credentials.map((credential, index) => (
        <div className="min-w-0 space-y-3 sm:col-span-2" key={`${fieldPrefix}-${String(index)}`}>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {Object.entries(credential)
              .filter(([key]) => key.toLowerCase() !== "provider")
              .map(([key, value]) => {
                const isPassword = key.toLowerCase() === "password";
                const fieldId = `${fieldPrefix}-${String(index)}-${key}`;
                const revealed = isRevealed(fieldId);
                const displayValue =
                  isPassword && !revealed
                    ? "*".repeat(Math.min(Math.max(String(value ?? "").length, 8), 32))
                    : formatDetailValue(value);

                return (
                  <div className="min-w-0" key={key}>
                    <p className="text-[13px] text-muted-foreground">{formatDetailLabel(key)}</p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      <p className="min-w-0 break-all text-[14px] leading-5 text-foreground">{displayValue}</p>
                      {isPassword ? (
                        <button
                          aria-label={revealed ? "Hide password" : "Show password"}
                          aria-pressed={revealed}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => onTogglePassword(fieldId)}
                          type="button"
                        >
                          {revealed ? (
                            <EyeOff className="size-4 -translate-y-0.5" />
                          ) : (
                            <Eye className="size-4 -translate-y-0.5" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

export const breachConnectorStyle = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 4px, transparent 4px, transparent 9px)",
};

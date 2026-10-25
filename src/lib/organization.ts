import type { User } from "@/types/auth";

export function getOrganizationId(user?: null | User): string | undefined {
  return user?.organization?.id ?? user?.organization_id ?? undefined;
}

export function hasOrganization(user?: null | User): boolean {
  return !!getOrganizationId(user);
}

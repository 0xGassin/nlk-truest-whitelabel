"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { State } from "@/components/state";
import { useAuth } from "@/lib/auth";
import { getOrganizationId } from "@/lib/organization";

export default function AssetsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const organizationId = getOrganizationId(user);

  useEffect(() => {
    if (organizationId) {
      router.replace("/assets/domains");
    }
  }, [organizationId, router]);

  if (!organizationId) {
    return <State.Empty preset="noOrganization" />;
  }

  return null;
}

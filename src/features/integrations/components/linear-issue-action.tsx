"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";

import { linearApi } from "../api/linear";

interface LinearIssueActionProps {
  description?: string;
  findingId: string;
  severity?: string;
  source?: string;
  title: string;
  url?: string;
}

/**
 * Dropdown action that creates a Linear ticket for a security finding.
 * Used as a default option in every issue/finding actions menu.
 */
export function LinearIssueAction({ description, findingId, severity, source, title, url }: LinearIssueActionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const connected = await linearApi.verifyConnection();
      if (!connected) {
        toast.error("Linear is not connected", {
          description: "Connect your Linear workspace in Integrations first.",
        });
        return;
      }

      const team = await linearApi.getCurrentTeam();
      if (!team) {
        toast.error("No Linear team selected", {
          description: "Select a team in Integrations > Linear before creating tickets.",
        });
        return;
      }

      const result = await linearApi.createIssueFromFinding({
        description,
        finding_id: findingId,
        severity,
        source,
        title,
        url,
      });

      toast.success("Linear issue created", {
        action: {
          label: "View in Linear",
          onClick: () => window.open(result.url, "_blank", "noopener,noreferrer"),
        },
        description: result.identifier,
      });
    } catch (error) {
      const apiError = parseApiError(error);
      toast.error(apiError.message || "Failed to create Linear issue", {
        description: "Check your Linear integration settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenuItem disabled={isLoading} onClick={(e) => void handleCreate(e)}>
      {isLoading ? <Spinner className="mr-2 size-4" /> : <ExternalLink className="mr-2 size-4" />}
      {isLoading ? "Creating ticket..." : "Create Linear ticket"}
    </DropdownMenuItem>
  );
}

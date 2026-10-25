import type { RemediationResult } from "@/features/issues";
import type { SecurityIssue } from "@/services/api/integration";

import { useEffect, useState } from "react";

import { toast } from "@/components/ui/toast/toast";
import { remediationService } from "@/features/issues";
import { hasSemgrepAutofix } from "@/features/issues/lib/autofix";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function useIssueRemediation(issue: null | SecurityIssue | undefined, organizationId?: string, repoId?: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [fixResult, setFixResult] = useState<null | RemediationResult>(null);
  const [error, setError] = useState<null | string>(null);
  const [prUrl, setPrUrl] = useState<null | string>(null);
  const [isFixDialogOpen, setIsFixDialogOpen] = useState(false);

  useEffect(() => {
    setIsAnalyzing(false);
    setIsCreatingPR(false);
    setFixResult(null);
    setError(null);
    setPrUrl(null);
    setIsFixDialogOpen(false);
  }, [issue?.rule, issue?.file, issue?.line, issue?.message]);

  const handleAnalyzeIssue = async () => {
    if (!organizationId || !repoId || !issue) {
      toast.error("Missing organization or repository information", {
        description: "We could not identify the project context for this action.",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFixResult(null);

    if (hasSemgrepAutofix(issue)) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setFixResult({
        explanation: "Semgrep provided an automatic fix for this issue based on the matching rule.",
        fix_code: issue.remediation ?? "",
        original_code: issue.suggestion ?? "",
      });
      setIsAnalyzing(false);
      setIsFixDialogOpen(true);
      return;
    }

    try {
      const result = await remediationService.analyzeIssue(organizationId, repoId, issue);
      setFixResult(result);
      setIsFixDialogOpen(true);
    } catch (error_: unknown) {
      const apiError_ = error_ as { response?: { data?: { error?: string }; status?: number } };
      if (apiError_.response?.status === 403) {
        toast("Upgrade Required", {
          description:
            apiError_.response.data?.error ??
            "AI AutoFix is not available on your current plan. Please upgrade to continue.",
        });
        window.open("/settings", "_blank");
      } else {
        const apiError = parseApiError(error_);
        logger.error("Failed to analyze issue", { error: apiError.message });
        setError(apiError.message);
        toast.error("Analysis Failed", {
          description: apiError.message,
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreatePR = async () => {
    if (!organizationId || !repoId || !issue) {
      toast.error("Missing organization or repository information");
      return;
    }

    setIsCreatingPR(true);
    setError(null);

    try {
      const result = await remediationService.createFixPR(organizationId, repoId, issue, fixResult ?? undefined);
      setPrUrl(result.pr_url);

      toast.success("Pull request created!", {
        action: {
          label: "View on GitHub",
          onClick: () => window.open(result.pr_url, "_blank"),
        },
        description: `PR #${String(result.pr_number)} is ready for review`,
        duration: 5000,
      });

      setTimeout(() => {
        window.open(result.pr_url, "_blank");
      }, 2000);
    } catch (error_: unknown) {
      const apiError_ = error_ as { response?: { data?: { error?: string }; status?: number } };
      if (apiError_.response?.status === 403) {
        toast("Upgrade Required", {
          description:
            apiError_.response.data?.error ??
            "AI AutoFix is not available on your current plan. Please upgrade to continue.",
        });
        window.open("/settings", "_blank");
      } else {
        const apiError = parseApiError(error_);
        logger.error("Failed to create pull request", { error: apiError.message });
        setError(apiError.message);
        toast.error("Failed to create PR", {
          description: apiError.message,
        });
      }
    } finally {
      setIsCreatingPR(false);
    }
  };

  return {
    clearFix: () => {
      setFixResult(null);
    },
    error,
    fixResult,
    handleAnalyzeIssue,
    handleCreatePR,
    isAnalyzing,
    isCreatingPR,
    isFixDialogOpen,
    prUrl,
    setIsFixDialogOpen,
  };
}

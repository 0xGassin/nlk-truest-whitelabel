import type { RemediationResult } from "@/features/issues";
import type { SecurityIssue } from "@/services/api/integration";

import { Bot, CheckCircle2, FileText, MoreHorizontal } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast/toast";
import { LinearIssueAction } from "@/features/integrations/components/linear-issue-action";
import { remediationService } from "@/features/issues";
import { fingerprintToUUID } from "@/lib/entity-id";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { AiFixDialog } from "./ai-fix-suggestion";
import { SecurityIssueDetails } from "./security-issue-details";

interface SecurityIssueRowProps {
  issue: SecurityIssue;
  onIgnore?: (issue: SecurityIssue) => void;
  organizationId?: string;
  repoId?: string;
}

export const SecurityIssueRow = memo(function SecurityIssueRow({
  issue,
  onIgnore,
  organizationId,
  repoId,
}: SecurityIssueRowProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [fixResult, setFixResult] = useState<null | RemediationResult>(null);
  const [error, setError] = useState<null | string>(null);
  const [prUrl, setPrUrl] = useState<null | string>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFixDialogOpen, setIsFixDialogOpen] = useState(false);

  const entityId = useMemo(() => {
    if (issue.id) return issue.id;
    const fingerprint = `${issue.issue_type ?? "iac"}-${issue.rule}-${issue.file}-${String(issue.line ?? 0)}-${issue.message}`;
    return fingerprintToUUID(fingerprint);
  }, [issue]);

  const handleAnalyzeIssue = async () => {
    if (!organizationId || !repoId) {
      toast.error("Missing organization or repository information", {
        description: "We could not identify the project context for this action.",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFixResult(null);

    if (issue.issue_type === "sast" && issue.tool === "semgrep" && issue.remediation) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setFixResult({
        explanation: "Semgrep provided an automatic fix for this issue based on the matching rule.",
        fix_code: issue.remediation,
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
    } catch (error_) {
      const apiError = parseApiError(error_);
      logger.error("Failed to analyze issue", { error: apiError.message });
      setError(apiError.message);
      toast.error("Analysis Failed", {
        description: apiError.message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreatePR = async () => {
    if (!organizationId || !repoId) {
      toast.error("Missing organization or repository information", {
        description: "We could not identify the project context for this action.",
      });
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
    } catch (error_) {
      const apiError = parseApiError(error_);
      logger.error("Failed to create pull request", { error: apiError.message });
      setError(apiError.message);
      toast.error("Failed to create PR", {
        description: apiError.message,
      });
    } finally {
      setIsCreatingPR(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        className="h-8 gap-2 text-muted-foreground shadow-none hover:text-foreground"
        disabled={isAnalyzing || !!fixResult || !!prUrl}
        onClick={(e) => {
          e.stopPropagation();
          void handleAnalyzeIssue();
        }}
        size="sm"
        variant="outline"
      >
        {isAnalyzing ? (
          <>
            <Spinner className="size-3.5" />
            Analyzing...
          </>
        ) : fixResult || prUrl ? (
          <>
            <CheckCircle2 className="size-3.5 text-green-500" />
            {prUrl ? "PR Created" : "Analyzed"}
          </>
        ) : (
          <>
            <Bot className="size-3.5" />
            Auto-Fix
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 text-muted-foreground hover:bg-[#e2e2e2] hover:text-foreground dark:hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
            }}
            size="icon"
            variant="ghost"
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerOpen(true);
            }}
          >
            <FileText className="mr-2 size-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onIgnore?.(issue);
            }}
          >
            Ignore Issue
          </DropdownMenuItem>
          <LinearIssueAction
            findingId={`${issue.rule}@${issue.file}:${String(issue.line ?? "")}`}
            severity={issue.severity}
            source={issue.source ?? issue.issue_type ?? "repo"}
            title={issue.message}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Drawer direction="right" onOpenChange={setIsDrawerOpen} open={isDrawerOpen}>
        <SecurityIssueDetails entityId={entityId} issue={issue} organizationId={organizationId} repoId={repoId} />
      </Drawer>

      {/* AI Fix Dialog */}
      {fixResult ? (
        <AiFixDialog
          error={error}
          filePath={issue.file}
          fixResult={fixResult}
          isCreatingPR={isCreatingPR}
          issueTitle={issue.message}
          onCreatePR={() => {
            void handleCreatePR();
          }}
          onDiscard={() => {
            setFixResult(null);
          }}
          onOpenChange={setIsFixDialogOpen}
          open={isFixDialogOpen}
          prUrl={prUrl}
          startLine={issue.line}
          vulnerableCode={issue.suggestion ?? undefined}
        />
      ) : null}
    </div>
  );
});

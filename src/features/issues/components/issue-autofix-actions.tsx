import type { SecurityIssue } from "@/services/api/integration";

import { Bot, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useIssueRemediation } from "@/features/issues/hooks/use-issue-remediation";
import { isAutofixAvailable } from "@/features/issues/lib/autofix";

import { AiFixDialog } from "./ai-fix-suggestion";

interface IssueAutofixActionsProps {
  issue: SecurityIssue;
  organizationId?: string;
  repoId?: string;
}

export function IssueAutofixActions({ issue, organizationId, repoId }: IssueAutofixActionsProps) {
  const {
    clearFix,
    error,
    fixResult,
    handleAnalyzeIssue,
    handleCreatePR,
    isAnalyzing,
    isCreatingPR,
    isFixDialogOpen,
    prUrl,
    setIsFixDialogOpen,
  } = useIssueRemediation(issue, organizationId, repoId);

  if (!isAutofixAvailable(issue)) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {error && !fixResult ? (
          <div className="mr-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
            <XCircle className="size-4" />
            <span>{error}</span>
          </div>
        ) : null}
        <Button
          className="h-8 gap-2 shadow-sm"
          disabled={isAnalyzing}
          onClick={() => {
            if (fixResult) {
              setIsFixDialogOpen(true);
            } else {
              void handleAnalyzeIssue();
            }
          }}
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Spinner className="size-3.5" />
              Analyzing...
            </>
          ) : fixResult ? (
            <>
              <Bot className="size-3.5 text-primary-foreground" />
              View Fix
            </>
          ) : (
            <>
              <Bot className="size-3.5" />
              Generate Fix
            </>
          )}
        </Button>
      </div>

      {fixResult ? (
        <AiFixDialog
          error={error}
          filePath={issue.file}
          fixResult={fixResult}
          isCreatingPR={isCreatingPR}
          issueTitle={issue.message}
          onCreatePR={() => void handleCreatePR()}
          onDiscard={clearFix}
          onOpenChange={setIsFixDialogOpen}
          open={isFixDialogOpen}
          prUrl={prUrl}
          startLine={issue.line}
          vulnerableCode={issue.suggestion ?? undefined}
        />
      ) : null}
    </>
  );
}

import type { RemediationResult } from "@/features/issues";
import type { SecurityIssue } from "@/services/api/integration";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  GitPullRequest,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownComponents } from "@/components/markdown-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { dialogPanelClassName, dialogPrimaryButtonClassName } from "@/components/ui/dialog-panel";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";
import { remediationService } from "@/features/issues";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface SecurityIssueCardProps {
  issue: SecurityIssue;
  organizationId?: string;
  repoId?: string;
}

export function SecurityIssueCard({ issue, organizationId, repoId }: SecurityIssueCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fix, setFix] = useState<null | RemediationResult>(null);
  const [error, setError] = useState<null | string>(null);

  const handleFixWithAI = async () => {
    if (!organizationId || !repoId) {
      toast.error("Missing organization or repository information", {
        description: "Details for this project are currently unavailable.",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFix(null);

    try {
      const aiFixSuggestion = await remediationService.analyzeIssue(organizationId, repoId, issue);
      setFix(aiFixSuggestion);
    } catch (error_: unknown) {
      const apiError = parseApiError(error_);
      logger.error("AI analysis failed", error_);
      setError(apiError.message);
      toast.error("Analysis Failed", {
        description: apiError.message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="size-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="text-warning size-4" />;
      default:
        return <CheckCircle className="size-4 text-primary" />;
    }
  };

  const getTriageBadge = (status?: string, score?: number) => {
    if (!status || status === "untriaged") return null;

    switch (status) {
      case "auto_ignored":
      case "ignored": // Fallthrough
        return (
          <Badge className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400" variant="outline">
            <CheckCircle className="mr-1 size-3" />
            AI Dismissed
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="border-destructive/20 bg-destructive/10 text-destructive" variant="outline">
            <CheckCircle2 className="mr-1 size-3" />
            Confirmed {score ? `(${String(score)}%)` : ""}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={cn(dialogPanelClassName, "gap-0 py-0 ring-0 transition-colors hover:bg-accent/50")}>
      <CardContent className="flex items-start gap-4 px-3.5 py-4">
        <div className="mt-1">{getSeverityIcon(issue.severity)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h4 className="truncate font-medium" title={issue.message}>
              {issue.message}
            </h4>
            <div className="flex items-center gap-2">
              {getTriageBadge(issue.status, issue.triage_score)}
              <SeverityBadge severity={issue.severity} />
              <Button
                className={dialogPrimaryButtonClassName}
                disabled={isAnalyzing || !organizationId || !repoId}
                onClick={() => {
                  void handleFixWithAI();
                }}
                size="sm"
              >
                {isAnalyzing ? (
                  <>
                    <Spinner className="mr-2 size-3" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="mr-2 size-3" />
                    Auto-Fix
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-mono">{issue.rule}</span>
            <span>•</span>
            <span className="truncate">
              {issue.file}
              {issue.line ? `:${String(issue.line)}` : ""}
            </span>
          </div>

          {issue.description && issue.description !== issue.message ? (
            <div className="mt-2 text-sm text-muted-foreground">
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {issue.description}
              </ReactMarkdown>
            </div>
          ) : null}

          {issue.remediation ? (
            <div className="mt-3 rounded-md border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-semibold text-foreground">Remediation</p>
              <div className="text-sm">
                <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                  {issue.issue_type === "sast" && issue.tool === "semgrep"
                    ? `\`\`\`${issue.file.split(".").pop() ?? ""}\n${issue.remediation}\n\`\`\``
                    : issue.remediation}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}

          {issue.references && issue.references.length > 0 ? (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">References</p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {issue.references.map((ref) => (
                  <li key={ref}>
                    <a className="text-primary hover:underline" href={ref} rel="noopener noreferrer" target="_blank">
                      {ref}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {issue.suggestion ? (
            <div className="mt-2">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Vulnerable Code</p>
              <pre className="overflow-x-auto rounded border bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                {issue.suggestion}
              </pre>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : null}

          <Dialog
            onOpenChange={(open) => {
              if (!open) setFix(null);
            }}
            open={!!fix}
          >
            <DialogContent
              className={cn(dialogPanelClassName, "gap-0 overflow-hidden p-0")}
              showCloseButton={false}
            >
              <DialogTitle className="sr-only">AI-Generated Fix</DialogTitle>
              <div className="flex items-center justify-between border-b border-[#eaeaea] px-3.5 py-3 dark:border-border">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="size-4" />
                  <span className="text-sm font-semibold">Auto-Fix</span>
                </div>
                <DialogClose asChild>
                  <Button className="size-7 rounded-md text-muted-foreground hover:text-foreground" size="icon" variant="ghost">
                    <XCircle className="size-4" />
                  </Button>
                </DialogClose>
              </div>
              <div className="flex min-h-[200px] flex-col px-3.5 py-4">
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{fix?.explanation}</p>
                  <div className="overflow-x-auto rounded-lg border border-[#eaeaea] bg-[#fafafa] p-3 dark:border-border dark:bg-card">
                    <pre className="font-mono text-xs leading-normal whitespace-pre-wrap text-foreground">
                      {fix?.fix_code}
                    </pre>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

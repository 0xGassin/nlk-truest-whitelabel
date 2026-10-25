import type { RemediationResult } from "@/features/issues";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ClipboardCheck,
  Copy,
  ExternalLink,
  GitPullRequest,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";

const DIFF_FONT =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace';

/** Number of unchanged context lines shown around each change */
const CONTEXT_LINES = 3;

// ─── Types ───────────────────────────────────────────────────────
interface AiFixDialogProps {
  /** Error message (if any) */
  error: null | string;
  /** File path for the diff header */
  filePath?: string;
  /** The AI-generated fix result */
  fixResult: RemediationResult;
  /** Whether a PR is being created */
  isCreatingPR: boolean;
  /** Issue title for the dialog header */
  issueTitle?: string;
  /** Handler to create a pull request */
  onCreatePR: () => void;
  /** Handler to discard the fix */
  onDiscard: () => void;
  /** Handler to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Whether the dialog is open */
  open: boolean;
  /** URL of the created PR (if any) */
  prUrl: null | string;
  /** Starting line number in the real file (1-based) */
  startLine?: number;
  /** The original vulnerable code snippet */
  vulnerableCode?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
function cleanCodeSnippet(code: string): string {
  return code.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");
}

/**
 * Strip AI-embedded line-number prefixes (e.g. "56:  code...") from each line.
 * Returns the cleaned code and the first detected real line number (or null).
 */
function stripLineNumberPrefixes(code: string): { cleaned: string; detectedStartLine: null | number } {
  const lines = code.split("\n");
  // Check if most lines start with a line-number prefix like "123: " or "123:\t"
  const prefixPattern = /^(\d+):[\s\t]/;
  const prefixedCount = lines.filter((l) => prefixPattern.test(l)).length;

  // Only strip if a majority of non-empty lines have the prefix
  const nonEmptyCount = lines.filter((l) => l.trim().length > 0).length;
  if (prefixedCount < nonEmptyCount * 0.5) {
    return { cleaned: code, detectedStartLine: null };
  }

  let firstLineNum: null | number = null;
  const cleanedLines = lines.map((line) => {
    const match = prefixPattern.exec(line);
    if (match) {
      const num = Number.parseInt(match[1], 10);
      firstLineNum ??= num;
      return line.slice(match[0].length);
    }
    return line;
  });

  return { cleaned: cleanedLines.join("\n"), detectedStartLine: firstLineNum };
}

// ─── Diff View (dual line numbers) ──────────────────────────────
interface DiffLine {
  content: string;
  newNum: null | number;
  oldNum: null | number;
  type: "add" | "remove" | "same";
}

function buildDiffLines(original: string, modified: string, startLine = 1): DiffLine[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const n = origLines.length;
  const m = modLines.length;

  // ── LCS via dynamic programming ──
  // dp[i][j] = length of LCS of origLines[0..i-1] and modLines[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origLines[i - 1] === modLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // ── Back-trace to produce diff lines ──
  const result: DiffLine[] = [];
  let i = n;
  let j = m;
  let oldNum = startLine + n; // we'll decrement as we backtrack
  let newNum = startLine + m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
      oldNum--;
      newNum--;
      result.push({ content: origLines[i - 1], newNum, oldNum, type: "same" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newNum--;
      result.push({ content: modLines[j - 1], newNum, oldNum: null, type: "add" });
      j--;
    } else {
      oldNum--;
      result.push({ content: origLines[i - 1], newNum: null, oldNum, type: "remove" });
      i--;
    }
  }

  result.reverse();
  return result;
}

/** Build a precise hunk header from the full set of diff lines. */
/**
 * Build a precise hunk header.
 * @param allLines    – the complete set of diff lines (for total counts)
 * @param visibleLines – the first visible segment lines (for start numbers)
 * @param startLine   – fallback start line
 */
function buildPreciseHunkHeader(allLines: DiffLine[], visibleLines: DiffLine[], startLine = 1): string {
  // Total old/new line counts across the entire diff
  let oldCount = 0;
  let newCount = 0;
  for (const l of allLines) {
    if (l.oldNum != null) oldCount++;
    if (l.newNum != null) newCount++;
  }

  // Start numbers come from the first visible lines so they match the gutter
  const oldStart = visibleLines.find((l) => l.oldNum != null)?.oldNum ?? startLine;
  const newStart = visibleLines.find((l) => l.newNum != null)?.newNum ?? startLine;

  return `@@ -${String(oldStart)},${String(oldCount)} +${String(newStart)},${String(newCount)} @@`;
}

// ─── Segment types for collapsible context ──────────────────────
type DiffSegment =
  { kind: "collapsed"; lines: DiffLine[]; startNew: number; startOld: number } | { kind: "lines"; lines: DiffLine[] };

/**
 * Groups diff lines into visible segments and collapsed unchanged sections.
 * Long runs of 'same' lines beyond `CONTEXT_LINES` around changes get collapsed.
 */
function buildSegments(diffLines: DiffLine[]): DiffSegment[] {
  // Mark which indices are "near" a change
  const nearChange = Array.from({ length: diffLines.length }).fill(false);
  for (let i = 0; i < diffLines.length; i++) {
    if (diffLines[i].type !== "same") {
      for (let j = Math.max(0, i - CONTEXT_LINES); j <= Math.min(diffLines.length - 1, i + CONTEXT_LINES); j++) {
        nearChange[j] = true;
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  while (i < diffLines.length) {
    if (nearChange[i] || diffLines[i].type !== "same") {
      // Visible run
      const start = i;
      while (i < diffLines.length && (nearChange[i] || diffLines[i].type !== "same")) {
        i++;
      }
      segments.push({ kind: "lines", lines: diffLines.slice(start, i) });
    } else {
      // Collapsed run of unchanged lines far from any change
      const start = i;
      while (i < diffLines.length && !nearChange[i] && diffLines[i].type === "same") {
        i++;
      }
      const collapsedLines = diffLines.slice(start, i);
      segments.push({
        kind: "collapsed",
        lines: collapsedLines,
        startNew: collapsedLines[0].newNum ?? 0,
        startOld: collapsedLines[0].oldNum ?? 0,
      });
    }
  }
  return segments;
}

function SuggestedFixDiff({
  filePath,
  modified,
  original,
  startLine = 1,
}: {
  filePath?: string;
  modified: string;
  original: string;
  startLine?: number;
}) {
  const diffLines = buildDiffLines(original, modified, startLine);
  const segments = buildSegments(diffLines);

  // Compute hunk header from the first visible (non-collapsed) segment
  // so -N and +N match the first line numbers shown in the gutter
  const firstVisibleLines = segments.find((s) => s.kind === "lines")?.lines ?? diffLines;
  const hunkHeader = buildPreciseHunkHeader(diffLines, firstVisibleLines, startLine);

  const [fileCollapsed, setFileCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(() => new Set());

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Compute max line number width for consistent gutter sizing
  const maxNum = Math.max(...diffLines.map((l) => l.oldNum ?? 0), ...diffLines.map((l) => l.newNum ?? 0));
  const gutterWidth = `${String(Math.max(String(maxNum).length * 0.65 + 0.6, 2))}rem`;

  const renderLine = (line: DiffLine, key: number | string) => {
    const isAdd = line.type === "add";
    const isRemove = line.type === "remove";

    const rowBg = isAdd ? "bg-green-50 dark:bg-green-500/10" : isRemove ? "bg-red-50 dark:bg-red-500/10" : "";

    const gutterBg = isAdd
      ? "bg-green-100/60 dark:bg-green-500/15"
      : isRemove
        ? "bg-red-100/60 dark:bg-red-500/15"
        : "";

    const textColor = isAdd
      ? "text-green-800 dark:text-green-300"
      : isRemove
        ? "text-red-800 dark:text-red-300"
        : "text-foreground";

    return (
      <div className={`flex w-full ${rowBg}`} key={key}>
        <span
          className={`shrink-0 border-r border-border/30 py-px pr-2 text-right text-muted-foreground/50 select-none ${gutterBg}`}
          style={{ fontFamily: DIFF_FONT, minWidth: gutterWidth, width: gutterWidth }}
        >
          {line.oldNum ?? ""}
        </span>
        <span
          className={`shrink-0 border-r border-border/30 py-px pr-2 text-right text-muted-foreground/50 select-none ${gutterBg}`}
          style={{ fontFamily: DIFF_FONT, minWidth: gutterWidth, width: gutterWidth }}
        >
          {line.newNum ?? ""}
        </span>
        <span className={`w-5 shrink-0 py-px text-center font-semibold select-none ${textColor}`}>
          {isAdd ? "+" : isRemove ? "-" : "\u00A0"}
        </span>
        <span className={`flex-1 py-px pr-4 whitespace-pre ${textColor}`} style={{ fontFamily: DIFF_FONT }}>
          {line.content}
        </span>
      </div>
    );
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background"
      style={{ fontFamily: DIFF_FONT }}
    >
      {/* ── File header ── */}
      <div
        className="flex cursor-pointer items-center border-b bg-muted/60 px-3 py-2 select-none"
        onClick={() => {
          setFileCollapsed((c) => !c);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setFileCollapsed((c) => !c);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {fileCollapsed ? <ChevronRight className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
          <span className="truncate font-medium text-foreground" style={{ fontFamily: DIFF_FONT }}>
            {filePath ?? "Suggested Fix"}
          </span>
        </div>
      </div>

      {fileCollapsed ? null : (
        <>
          {/* ── Hunk header ── */}
          <div className="flex shrink-0 items-center gap-2 border-b bg-blue-50/60 px-3 py-1.5 text-xs text-blue-700 dark:bg-blue-900/10 dark:text-blue-400">
            <GitPullRequest className="size-3.5 shrink-0 opacity-60" />
            <span style={{ fontFamily: DIFF_FONT }}>{hunkHeader}</span>
          </div>

          {/* ── Diff lines with collapsible sections ── */}
          <div
            className="min-h-0 flex-1 overflow-auto text-xs leading-[1.625] tabular-nums"
            style={{ fontFamily: DIFF_FONT }}
          >
            <div className="inline-block min-w-full">
              {segments.map((seg, segIdx) => {
                if (seg.kind === "lines") {
                  return seg.lines.map((line, li) => renderLine(line, `${String(segIdx)}-${String(li)}`));
                }

                // Collapsed section
                const isExpanded = expandedSections.has(segIdx);

                if (isExpanded) {
                  return seg.lines.map((line, li) => renderLine(line, `${String(segIdx)}-${String(li)}`));
                }

                const count = seg.lines.length;
                return (
                  <div
                    className="flex cursor-pointer items-center gap-2 border-y border-border/20 bg-blue-50/40 px-3 py-1 transition-colors select-none hover:bg-blue-50/80 dark:bg-blue-900/5 dark:hover:bg-blue-900/15"
                    key={`collapse-${String(segIdx)}`}
                    onClick={() => {
                      toggleSection(segIdx);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        toggleSection(segIdx);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
                    <span className="text-[11px] text-muted-foreground">
                      Show {count} hidden line{count === 1 ? "" : "s"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dialog Component ────────────────────────────────────────────
export function AiFixDialog({
  error,
  filePath,
  fixResult,
  inline,
  isCreatingPR,
  issueTitle,
  onCreatePR,
  onDiscard,
  onOpenChange,
  open,
  prUrl,
  startLine,
  vulnerableCode: _vulnerableCode,
  actionsInFooter,
}: AiFixDialogProps & { actionsInFooter?: boolean; inline?: boolean }) {
  const [copied, setCopied] = useState(false);

  const rawOriginal = fixResult.original_code ? cleanCodeSnippet(fixResult.original_code) : "";
  const rawModified = cleanCodeSnippet(fixResult.fix_code);

  // Strip AI-embedded line-number prefixes and detect real start line
  const { cleaned: cleanOriginal, detectedStartLine: detectedOrigStart } = stripLineNumberPrefixes(rawOriginal);
  const { cleaned: cleanModified, detectedStartLine: detectedModStart } = stripLineNumberPrefixes(rawModified);

  // Use detected start line from original code, then modified, then prop, then 1
  const effectiveStartLine = detectedOrigStart ?? detectedModStart ?? startLine;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fixResult.fix_code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDiscard = () => {
    onDiscard();
    onOpenChange(false);
  };

  const fixContent = prUrl ? (
    <div className="space-y-5 rounded-2xl border border-primary/10 bg-primary/5 p-8 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold tracking-tight">Commit Successful</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The security fix has been successfully applied and pushed to a new branch in your repository.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button className="px-6 shadow-lg shadow-primary/20" onClick={() => window.open(prUrl, "_blank")}>
          <ExternalLink className="mr-2 size-4" />
          View Pull Request
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{fixResult.explanation}</div>

      {cleanOriginal ? (
        <SuggestedFixDiff
          filePath={filePath}
          modified={cleanModified}
          original={cleanOriginal}
          startLine={effectiveStartLine}
        />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold tracking-widest text-muted-foreground/60 uppercase">Remediation Patch</h4>
          <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/30 shadow-inner">
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed tabular-nums" style={{ fontFamily: DIFF_FONT }}>
              {cleanModified}
            </pre>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col gap-4">
        {fixContent}

        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <XCircle className="mt-0.5 size-5 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100">Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        ) : null}

        {actionsInFooter ? null : (
          <div className="flex items-center justify-between gap-2">
            <Button className="h-8" onClick={handleDiscard} size="sm" variant="ghost">
              Discard
            </Button>
            <div className="flex items-center gap-2">
              <Button
                className="h-8"
                onClick={() => {
                  void handleCopyToClipboard();
                }}
                size="sm"
                variant="outline"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="mr-2 size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button className="h-8" disabled={isCreatingPR} onClick={onCreatePR} size="sm">
                {isCreatingPR ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Creating PR...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="mr-2 size-4" />
                    Apply Fix
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden border-primary/10 bg-background/95 pb-0 backdrop-blur-md sm:max-w-4xl">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="text-xl leading-normal break-words">
            {issueTitle ?? "AI Remediation Assistant"}
          </DialogTitle>
          {issueTitle ? <DialogDescription className="break-words">AI Remediation Assistant</DialogDescription> : null}
        </DialogHeader>

        {fixContent}

        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <XCircle className="mt-0.5 size-5 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-100">Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="-mx-6 shrink-0 border-t bg-muted">
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <Button className="h-8" onClick={handleDiscard} size="sm" variant="ghost">
                Discard
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-8"
                onClick={() => {
                  void handleCopyToClipboard();
                }}
                size="sm"
                variant="outline"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="mr-2 size-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button className="h-8" disabled={isCreatingPR} onClick={onCreatePR} size="sm">
                {isCreatingPR ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    Creating PR...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="mr-2 size-4" />
                    Apply Fix
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AiFixDialogActions({
  fixCode,
  isCreatingPR,
  onCopy,
  onCreatePR,
  onDiscard,
}: {
  fixCode: string;
  isCreatingPR: boolean;
  onCopy?: () => void;
  onCreatePR: () => void;
  onDiscard: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy =
    onCopy ??
    (async () => {
      try {
        await navigator.clipboard.writeText(fixCode);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    });

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Button className="h-8" onClick={onDiscard} size="sm" variant="ghost">
        Discard
      </Button>
      <div className="flex items-center gap-2">
        <Button
          className="h-8"
          onClick={() => {
            void handleCopy();
          }}
          size="sm"
          variant="outline"
        >
          {copied ? (
            <>
              <ClipboardCheck className="mr-2 size-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 size-4" />
              Copy
            </>
          )}
        </Button>
        <Button className="h-8" disabled={isCreatingPR} onClick={onCreatePR} size="sm">
          {isCreatingPR ? (
            <>
              <Spinner className="mr-2 size-4" />
              Creating PR...
            </>
          ) : (
            <>
              <GitPullRequest className="mr-2 size-4" />
              Apply Fix
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

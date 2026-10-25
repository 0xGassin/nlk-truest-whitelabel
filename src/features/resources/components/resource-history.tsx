import type { HistoryItem } from "@/types";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronDown,
  Clock,
  Code,
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { detailDrawerSurfaceClassName, Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import {
  IssueDrawerHeaderSection,
  IssueDrawerTitle,
} from "@/features/issues/components/issue-drawer-ui";
import { cn } from "@/lib/utils";
import { getResourceHistory } from "@/services/api/inventory";

const DIFF_FONT =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace';

interface ParsedPatchLine {
  content: string;
  newNum: null | number;
  oldNum: null | number;
  type: "add" | "meta" | "remove" | "same";
}

interface ParsedPatchHunk {
  header: string;
  lines: ParsedPatchLine[];
}

interface ParsedPatchFile {
  hunks: ParsedPatchHunk[];
  path: string;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31_536_000;
  if (interval > 1) return `${String(Math.floor(interval))} years ago`;
  interval = seconds / 2_592_000;
  if (interval > 1) return `${String(Math.floor(interval))} months ago`;
  interval = seconds / 86_400;
  if (interval > 1) return `${String(Math.floor(interval))} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return `${String(Math.floor(interval))} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return `${String(Math.floor(interval))} minutes ago`;
  return `${String(Math.floor(seconds))} seconds ago`;
}

function extractPatchPath(line: string) {
  if (line.startsWith("diff --git ")) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (match) return match[2];
  }

  if (line.startsWith("+++ ")) {
    const path = line.slice(4).trim();
    if (path === "/dev/null") return "Deleted file";
    return path.replace(/^b\//, "");
  }

  return null;
}

function parseHunkStart(line: string) {
  const match = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/.exec(line);
  if (match) {
    return {
      newLine: Number(match[3]),
      oldLine: Number(match[1]),
    };
  }

  const matchNoCount = /^@@ -(\d+) \+(\d+) @@$/.exec(line);
  if (!matchNoCount) return null;

  return {
    newLine: Number(matchNoCount[2]),
    oldLine: Number(matchNoCount[1]),
  };
}

function parseUnifiedPatch(patch: string): ParsedPatchFile[] {
  const lines = patch.split("\n");
  const files: ParsedPatchFile[] = [];
  let currentFile: null | ParsedPatchFile = null;
  let currentHunk: null | ParsedPatchHunk = null;
  let currentOldLine = 0;
  let currentNewLine = 0;

  const ensureFile = () => {
    if (!currentFile) {
      currentFile = { hunks: [], path: "Patch" };
      files.push(currentFile);
    }
    return currentFile;
  };

  for (const line of lines) {
    const patchPath = extractPatchPath(line);
    if (patchPath && line.startsWith("diff --git ")) {
      currentFile = { hunks: [], path: patchPath };
      files.push(currentFile);
      currentHunk = null;
      continue;
    }

    if (patchPath && line.startsWith("+++ ")) {
      ensureFile().path = patchPath;
      continue;
    }

    if (line.startsWith("@@")) {
      const start = parseHunkStart(line);
      currentHunk = { header: line, lines: [] };
      ensureFile().hunks.push(currentHunk);
      if (start) {
        currentOldLine = start.oldLine;
        currentNewLine = start.newLine;
      }
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.lines.push({
        content: line.slice(1),
        newNum: currentNewLine++,
        oldNum: null,
        type: "add",
      });
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.lines.push({
        content: line.slice(1),
        newNum: null,
        oldNum: currentOldLine++,
        type: "remove",
      });
      continue;
    }

    if (line.startsWith(" ")) {
      currentHunk.lines.push({
        content: line.slice(1),
        newNum: currentNewLine++,
        oldNum: currentOldLine++,
        type: "same",
      });
      continue;
    }

    currentHunk.lines.push({
      content: line,
      newNum: null,
      oldNum: null,
      type: "meta",
    });
  }

  return files.filter((file) => file.hunks.length > 0);
}

function CommitPatchView({ patch }: { patch: string }) {
  const parsedFiles = parseUnifiedPatch(patch);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<number>>(() => new Set());

  const toggleFile = (index: number) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (parsedFiles.length === 0) {
    return (
        <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border bg-card"
          style={{ fontFamily: DIFF_FONT }}
        >
          <div className="flex items-center border-b px-4 py-2.5 text-sm font-medium">
            <div className="flex min-w-0 items-center gap-2">
              <Code className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium text-foreground" style={{ fontFamily: DIFF_FONT }}>
                Patch
              </span>
            </div>
          </div>
          <div className="max-h-[40dvh] overflow-auto">
            <pre className="p-4 text-xs leading-[1.625] tabular-nums" style={{ fontFamily: DIFF_FONT }}>
              {patch}
            </pre>
          </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {parsedFiles.map((file, fileIndex) => {
        const isCollapsed = collapsedFiles.has(fileIndex);
        const maxNum = Math.max(
          0,
          ...file.hunks.flatMap((hunk) => hunk.lines.flatMap((line) => [line.oldNum ?? 0, line.newNum ?? 0])),
        );
        const gutterWidth = `${String(Math.max(String(maxNum).length * 0.65 + 0.6, 2))}rem`;

        const additions = file.hunks.reduce(
          (sum, hunk) => sum + hunk.lines.filter((l) => l.type === "add").length,
          0,
        );
        const deletions = file.hunks.reduce(
          (sum, hunk) => sum + hunk.lines.filter((l) => l.type === "remove").length,
          0,
        );

        return (
          <div
            className="flex shrink-0 flex-col overflow-hidden rounded-lg border bg-card"
            key={`${file.path}-${String(fileIndex)}`}
            style={{ fontFamily: DIFF_FONT }}
          >
            <button
              aria-expanded={!isCollapsed}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-medium select-none",
                !isCollapsed && "border-b",
              )}
              onClick={() => {
                toggleFile(fileIndex);
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isCollapsed && "-rotate-90",
                  )}
                />
                <span className="truncate font-medium text-foreground" style={{ fontFamily: DIFF_FONT }}>
                  {file.path}
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 tabular-nums dark:text-emerald-400">
                  +{additions}
                </span>
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-600 tabular-nums dark:text-red-400">
                  -{deletions}
                </span>
              </span>
            </button>

            {isCollapsed ? null : (
              <div className="max-h-[40dvh] overflow-auto text-xs leading-[1.625] tabular-nums">
                <div className="flex flex-col">
                  {file.hunks.map((hunk, hunkIndex) => (
                    <div className={hunkIndex > 0 ? "border-t" : ""} key={`${file.path}-hunk-${String(hunkIndex)}`}>
                      <div className="flex shrink-0 items-center gap-2 border-b bg-blue-50/60 px-3 py-1.5 text-xs text-blue-700 dark:bg-blue-900/10 dark:text-blue-400">
                        <GitPullRequest className="size-3.5 shrink-0 opacity-60" />
                        <span style={{ fontFamily: DIFF_FONT }}>{hunk.header}</span>
                      </div>

                      <div>
                        <div className="inline-block min-w-full">
                        {hunk.lines.map((line, lineIndex) => {
                          const isAdd = line.type === "add";
                          const isRemove = line.type === "remove";
                          const isMeta = line.type === "meta";

                          const rowBg = isAdd
                            ? "bg-green-50 dark:bg-green-500/10"
                            : isRemove
                              ? "bg-red-50 dark:bg-red-500/10"
                              : "";

                          const gutterBg = isAdd
                            ? "bg-green-100/60 dark:bg-green-500/15"
                            : isRemove
                              ? "bg-red-100/60 dark:bg-red-500/15"
                              : "";

                          const textColor = isAdd
                            ? "text-green-800 dark:text-green-300"
                            : isRemove
                              ? "text-red-800 dark:text-red-300"
                              : isMeta
                                ? "text-muted-foreground"
                                : "text-foreground";

                          return (
                            <div
                              className={`flex w-full ${rowBg}`}
                              key={`${String(fileIndex)}-${String(hunkIndex)}-${String(lineIndex)}`}
                            >
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
                                {isAdd ? "+" : isRemove ? "-" : isMeta ? "." : "\u00A0"}
                              </span>
                              <span
                                className={`flex-1 py-px pr-4 whitespace-pre ${textColor}`}
                                style={{ fontFamily: DIFF_FONT }}
                              >
                                {line.content || " "}
                              </span>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ResourceHistoryProps {
  connectionId?: string;
  organizationId?: string;
  resourceId: string;
}

export function ResourceHistory({ connectionId, organizationId, resourceId }: ResourceHistoryProps) {
  const params = useParams();
  const orgId = organizationId ?? (params.organizationId as string);
  const connId = connectionId ?? (params.connectionId as string);

  const [selectedCommit, setSelectedCommit] = useState<HistoryItem | null>(null);

  const {
    data: history = [],
    error,
    isLoading,
  } = useQuery({
    enabled: !!orgId && !!connId && !!resourceId,
    queryFn: () => getResourceHistory(orgId, connId, resourceId),
    queryKey: ["resource-history", orgId, connId, resourceId],
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-destructive">
        <AlertCircle className="size-4" />
        <span>Failed to load history</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <p>No history recorded for this resource.</p>
        <p className="mt-2 text-xs">
          History will appear when commits are pushed to linked repositories or when resource state changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative ml-3 space-y-6 border-l border-muted">
        {history.map((item, index) => {
          const isCommit = item.type === "commit";
          const isAttribution = item.change_type === "attribution";
          const isUpdate = item.change_type === "update";

          return (
            <div className="relative pl-6" key={`history-${index}`}>
              <span
                className={cn(
                  "absolute top-0 left-[-9px] flex size-4 items-center justify-center rounded-full ring-4 ring-background",
                  isCommit
                    ? "bg-green-600 dark:bg-green-500"
                    : isAttribution
                      ? "bg-blue-600 dark:bg-blue-500"
                      : "bg-muted-foreground",
                )}
              >
                {isCommit ? (
                  <Code className="size-3 text-white" />
                ) : isAttribution ? (
                  <GitCommit className="size-3 text-white" />
                ) : isUpdate ? (
                  <RefreshCw className="size-3 text-white" />
                ) : (
                  <Clock className="size-3 text-white" />
                )}
              </span>

              <div className="flex flex-col">
                {isCommit ? (
                  <div
                    className="group -mx-2 -my-1 transform-gpu cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors duration-150 hover:border-border/60 hover:bg-muted/5 active:opacity-95"
                    onClick={() => {
                      setSelectedCommit(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCommit(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground/90">
                          {item.commit_sha?.slice(0, 7)}
                        </code>
                        <span className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</span>
                        {item.patch ? (
                          <div className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium">
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 tabular-nums dark:text-emerald-400">
                              +
                              {item.patch.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"))
                                .length}
                            </span>
                            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-600 tabular-nums dark:text-red-400">
                              -
                              {item.patch.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"))
                                .length}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-sm leading-snug font-medium text-foreground">
                        {item.commit_message}
                      </p>

                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/90">{item.author}</span>
                        {item.branch ? (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="inline-flex items-center gap-1 font-mono">
                              <GitBranch className="size-3" />
                              {item.branch}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="capitalize">{item.change_type?.replace("_", " ") ?? "Change"}</span>
                      <span className="text-xs font-normal text-muted-foreground">{timeAgo(item.timestamp)}</span>
                    </div>
                    {item.change_type === "attribution" ? (
                      <div className="mt-1 text-sm text-muted-foreground">Resource discovered.</div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Commit Details Semi-Drawer */}
      <Drawer
        direction="bottom"
        modal={false}
        onOpenChange={(open) => {
          if (!open) setSelectedCommit(null);
        }}
        open={!!selectedCommit}
      >
        <DrawerContent
          className={cn(
            detailDrawerSurfaceClassName,
            "ml-auto flex h-[50%] w-full max-w-[50%] flex-col overflow-hidden p-0 shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.08)] outline-none dark:shadow-[0_-6px_16px_-10px_rgba(0,0,0,0.22)]",
          )}
          hideOverlay
          side="bottom"
        >
          <IssueDrawerHeaderSection>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <IssueDrawerTitle className="truncate">{selectedCommit?.commit_message}</IssueDrawerTitle>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedCommit?.branch ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <GitBranch className="size-3.5" />
                      {selectedCommit.branch}
                    </span>
                  ) : null}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground/90">
                    {selectedCommit?.commit_sha?.slice(0, 7)}
                  </code>
                </div>
              </div>
              <DrawerClose asChild>
                <Button className="size-8" size="icon" variant="ghost">
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>
          </IssueDrawerHeaderSection>

          {selectedCommit ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              {/* Code Changes */}
              {selectedCommit.patch ? (
                <CommitPatchView patch={selectedCommit.patch} />
              ) : null}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

"use client";

import type { GitHubRepo } from "@/services/api/github";
import type { GitHubRepoRaw } from "@/types/api";

import { Check, Search, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dialogPrimaryButtonClassName, fieldLabelClassName } from "@/components/ui/dialog-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";
import { integrationDialogContentClassName } from "@/features/integrations/components/dialog-shell";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { githubApi } from "@/services/api/github";

const panelPaddingX = "px-3.5";
const helperTextClassName =
  "text-sm font-normal leading-snug text-[#666666] clean:text-[#666666] soft:text-[#666666] dark:text-muted-foreground";
const internalCardClassName =
  "isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[#eaeaea] bg-white dark:border-border dark:bg-card";
const tableHeaderClassName = "sticky top-0 z-30 bg-muted/30 text-foreground";
const tableHeaderCellClassName =
  "relative h-10 px-4 text-left align-middle whitespace-nowrap text-[13px] font-medium text-muted-foreground";
const tableBodyCellClassName = "px-4 py-3 align-middle";
const tableRowClassName =
  "group h-16 border-b border-[#eaeaea] bg-white text-sm font-normal text-[hsl(0,0%,20%)] transition-colors last:border-b-0 hover:bg-[#fafafa] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent";

interface LinkRepositoryDialogProps {
  linkedRepoNames: Set<string>;
  onOpenChange: (open: boolean) => void;
  onRepoLinked: (repo: GitHubRepo) => Promise<void> | void;
  open: boolean;
  organizationId: string;
}

export function LinkRepositoryDialog({
  linkedRepoNames,
  onOpenChange,
  onRepoLinked,
  open,
  organizationId,
}: LinkRepositoryDialogProps) {
  const [repos, setRepos] = useState<GitHubRepoRaw[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(() => new Set());
  const [linkingRepos, setLinkingRepos] = useState<Set<string>>(() => new Set());
  const [isLinking, setIsLinking] = useState(false);
  const selectAllCheckbox = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollShadow, setScrollShadow] = useState({ bottom: false, top: false });

  const updateScrollShadow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { clientHeight, scrollHeight, scrollTop } = el;
    setScrollShadow({
      bottom: scrollTop + clientHeight < scrollHeight - 1,
      top: scrollTop > 0,
    });
  }, []);

  const fetchRepos = async () => {
    setIsLoading(true);
    try {
      const availableRepos = await githubApi.listRepos(organizationId);
      setRepos(availableRepos);
    } catch (error) {
      toast.error("Failed to fetch repositories", {
        description: "We could not load your GitHub repositories. Please check your connection.",
      });
      logger.error("Failed to fetch repositories", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedRepos(new Set());
      setLinkingRepos(new Set());
      setIsLinking(false);
      setSearchQuery("");
      void fetchRepos();
    }
  }, [open]);

  const filteredRepos = useMemo(() => {
    if (!searchQuery) return repos;
    return repos.filter((repo) => repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [repos, searchQuery]);

  const selectableRepos = filteredRepos.filter((r) => !linkedRepoNames.has(r.full_name));
  const allSelectableSelected =
    selectableRepos.length > 0 && selectableRepos.every((r) => selectedRepos.has(r.full_name));
  const someSelected = selectedRepos.size > 0;

  useEffect(() => {
    if (selectAllCheckbox.current) {
      selectAllCheckbox.current.indeterminate = someSelected && !allSelectableSelected;
    }
  }, [someSelected, allSelectableSelected]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoading || filteredRepos.length === 0) return;

    updateScrollShadow();
    el.addEventListener("scroll", updateScrollShadow, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollShadow);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollShadow);
      resizeObserver.disconnect();
    };
  }, [filteredRepos.length, isLoading, updateScrollShadow]);

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(selectableRepos.map((r) => r.full_name)));
    }
  };

  const toggleRepo = (fullName: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else {
        next.add(fullName);
      }
      return next;
    });
  };

  const handleLinkSelected = async () => {
    setIsLinking(true);
    const selected = filteredRepos.filter((r) => selectedRepos.has(r.full_name));

    for (const repo of selected) {
      setLinkingRepos((prev) => new Set(prev).add(repo.full_name));
      try {
        const linkedRepo = await githubApi.linkRepo(organizationId, repo.full_name);
        toast.success("Repository linked", {
          description: `${repo.full_name} has been linked. Auto-scan is starting.`,
        });
        await onRepoLinked(linkedRepo);
      } catch (error: unknown) {
        const apiError = error as { response?: { data?: { message?: string }; status?: number } };
        if (apiError.response?.status === 403) {
          toast("Repository Limit Reached", {
            description:
              apiError.response.data?.message ??
              "You've reached the repository limit for your plan. Please upgrade to link more repositories.",
          });
          window.open("/settings", "_blank");
          break;
        } else {
          toast.error(`Failed to link ${repo.full_name}`);
          logger.error("Failed to link repository", error);
        }
      } finally {
        setLinkingRepos((prev) => {
          const next = new Set(prev);
          next.delete(repo.full_name);
          return next;
        });
      }
    }

    setIsLinking(false);
    setSelectedRepos(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={integrationDialogContentClassName} showCloseButton={false}>
        <div className="flex h-full min-h-0 flex-col bg-white dark:bg-card">
          <div className={cn(panelPaddingX, "flex min-h-0 flex-1 flex-col overflow-hidden pt-4")}>
            <DialogHeader className="mb-6 flex shrink-0 flex-row items-center justify-between space-y-0 text-left">
              <DialogTitle className="text-[17.5px] font-semibold tracking-[-0.4px] text-foreground">
                Link Repository
              </DialogTitle>
              <DialogClose className="shrink-0 rounded-xs text-foreground/70 transition-opacity hover:text-foreground focus:outline-hidden disabled:pointer-events-none">
                <XIcon className="size-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogHeader>

            <div className="shrink-0 space-y-2 px-0.5">
              <Label className={fieldLabelClassName}>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-[#666666] dark:text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search repositories..."
                  value={searchQuery}
                  wrapperClassName="h-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-8 text-[#666666] dark:text-muted-foreground" />
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className={cn("flex flex-1 items-center justify-center text-sm", helperTextClassName)}>
                {searchQuery ? "No repositories found" : "No repositories available"}
              </div>
            ) : (
              <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden pb-3">
                <div className={internalCardClassName}>
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="h-full min-h-0 overflow-auto" ref={scrollRef}>
                      <table className="w-full table-fixed">
                        <thead className={tableHeaderClassName} style={{ boxShadow: "inset 0 -0.5px 0 var(--border)" }}>
                          <tr className="h-10">
                            <th className={cn(tableHeaderCellClassName, "w-12")}>
                              <div className="flex h-full items-center">
                                <input
                                  ref={selectAllCheckbox}
                                  checked={allSelectableSelected}
                                  className="size-4 cursor-pointer rounded border-[#eaeaea] accent-[#2563eb] dark:border-border"
                                  onChange={toggleSelectAll}
                                  type="checkbox"
                                />
                              </div>
                            </th>
                            <th className={tableHeaderCellClassName}>
                              <div className="flex h-full items-center">
                                <span>Repository</span>
                              </div>
                            </th>
                            <th className={cn(tableHeaderCellClassName, "w-28")}>
                              <div className="flex h-full items-center">
                                <span>Branch</span>
                              </div>
                            </th>
                            <th className={cn(tableHeaderCellClassName, "w-24 text-right")}>
                              <div className="flex h-full items-center justify-end">
                                <span>Status</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRepos.map((repo) => {
                            const isLinked = linkedRepoNames.has(repo.full_name);
                            const isSelected = selectedRepos.has(repo.full_name);
                            const isLinkingRepo = linkingRepos.has(repo.full_name);

                            return (
                              <tr
                                className={cn(
                                  tableRowClassName,
                                  isLinked && "opacity-50",
                                  !isLinked && "cursor-pointer",
                                  isSelected &&
                                    !isLinked &&
                                    "bg-[#f5f8ff] hover:bg-[#f5f8ff] dark:bg-blue-950/40 dark:hover:bg-blue-950/50",
                                )}
                                key={repo.id}
                                onClick={() => {
                                  if (!isLinked && !isLinking) {
                                    toggleRepo(repo.full_name);
                                  }
                                }}
                              >
                                <td className={cn(tableBodyCellClassName, "w-12")}>
                                  <div className="flex h-full items-center">
                                    {isLinked ? (
                                      <Check className="size-4 text-[#666666] dark:text-muted-foreground" />
                                    ) : (
                                      <input
                                        checked={isSelected}
                                        className="size-4 cursor-pointer rounded border-[#eaeaea] accent-[#2563eb] dark:border-border"
                                        onChange={() => {
                                          toggleRepo(repo.full_name);
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                        type="checkbox"
                                      />
                                    )}
                                  </div>
                                </td>
                                <td className={cn(tableBodyCellClassName, "overflow-hidden")}>
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="size-6 shrink-0 ring-1 ring-[#eaeaea] dark:ring-border">
                                      <AvatarImage src={repo.owner.avatar_url} />
                                      <AvatarFallback className="bg-[#fafafa] text-[10px] text-[#666666] dark:bg-muted dark:text-muted-foreground">
                                        {repo.owner.login.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate font-normal">{repo.full_name}</span>
                                    {repo.archived && (
                                      <span className="shrink-0 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-normal text-orange-700 ring-1 ring-orange-200/80">
                                        Archived
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td
                                  className={cn(
                                    tableBodyCellClassName,
                                    "w-28 text-[13px] text-[#666666] dark:text-muted-foreground",
                                  )}
                                >
                                  <div className="flex h-full items-center">
                                    <span className="truncate">{repo.default_branch}</span>
                                  </div>
                                </td>
                                <td className={cn(tableBodyCellClassName, "w-24 text-right")}>
                                  <div className="flex h-full items-center justify-end">
                                    {isLinked ? (
                                      <span className="text-[13px] text-[#666666] dark:text-muted-foreground">
                                        Linked
                                      </span>
                                    ) : isLinkingRepo ? (
                                      <Spinner className="size-4 text-[#666666] dark:text-muted-foreground" />
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0 top-10 z-20 h-8 transition-opacity duration-300",
                        scrollShadow.top ? "opacity-100" : "opacity-0",
                      )}
                      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.035), transparent)" }}
                    />
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 transition-opacity duration-300",
                        scrollShadow.bottom ? "opacity-100" : "opacity-0",
                      )}
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.035), transparent)" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-4 border-t border-[#eaeaea] bg-[#fafafa] py-3 dark:border-border dark:bg-card",
              panelPaddingX,
            )}
          >
            <p className={cn("min-w-0 truncate", helperTextClassName)}>
              {selectedRepos.size > 0
                ? `${selectedRepos.size} ${selectedRepos.size === 1 ? "repository" : "repositories"} selected`
                : "Select repositories to link"}
            </p>
            <Button
              className={dialogPrimaryButtonClassName}
              disabled={!someSelected || isLinking}
              onClick={() => {
                void handleLinkSelected();
              }}
            >
              {isLinking ? <Spinner className="mr-2 size-4" /> : null}
              Link{selectedRepos.size > 0 ? ` (${selectedRepos.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import type { IssueDrawerTabId } from "./issue-drawer-ui";
import type { SecurityIssue } from "@/services/api/integration";
import type { Note } from "@/services/api/notes";

import {
  Bot,
  Check,
  Copy,
  GalleryVerticalEnd,
  MessageSquare,
  Pencil,
  Send,
  Shapes,
  Share2,
  Shield,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { State } from "@/components/state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { DrawerContent, detailDrawerSurfaceClassName } from "@/components/ui/drawer";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";
import { cn, getIdenticonUrl } from "@/lib/utils";
import { notesService } from "@/services/api/notes";

import { useAuth } from "@/features/auth";

import { AiFixDialog, AiFixDialogActions } from "./ai-fix-suggestion";
import { useIssueRemediation } from "@/features/issues/hooks/use-issue-remediation";
import { isAutofixAvailable } from "@/features/issues/lib/autofix";
import {
  ISSUE_DRAWER_BODY_CLASS,
  ISSUE_DRAWER_SECTION_CLASS,
  ISSUE_DRAWER_SECTIONS_CLASS,
  IssueDrawerAffectedFilesTable,
  IssueDrawerAffectedResourcesTable,
  IssueDrawerCodeBlock,
  IssueDrawerDetailItem,
  IssueDrawerFooter,
  IssueDrawerHeaderSection,
  IssueDrawerIgnoreButton,
  IssueDrawerSectionHeading,
  IssueDrawerTabs,
  IssueDrawerTitle,
} from "./issue-drawer-ui";

const EMPTY_STRINGS_ARRAY: string[] = [];

const markdownComponents = {
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ol>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <span className="font-normal text-inherit">{children}</span>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>
  ),
};

interface SecurityIssueDetailsProps {
  affectedFiles?: string[];
  affectedResources?: string[];
  entityId?: string;
  issue: null | SecurityIssue;
  onBack?: () => void;
  onClose?: () => void;
  onIgnore?: () => Promise<void> | void;
  organizationId?: string;
  renderContentOnly?: boolean;
  repoId?: string;
  repoName?: string;
  repoUrl?: string;
  repoAvatarUrl?: string;
}

type IssueDrawerView = IssueDrawerTabId;

function getIssueTypeLabel(issueType?: string) {
  if (issueType === "iac") return "Infrastructure as Code";
  if (issueType === "sast") return "SAST";
  if (issueType === "cspm") return "CSPM";
  if (issueType === "dependencies" || issueType === "sca") return "Dependencies";
  return (issueType ?? "").toUpperCase();
}

function isPackageDependencyIssue(issue: SecurityIssue) {
  return (
    (issue.issue_type === "dependencies" || issue.issue_type === "sca" || issue.tool === "trivy-sca") &&
    Boolean(issue.metadata?.pkg_name)
  );
}

export function SecurityIssueDetails({
  affectedFiles = EMPTY_STRINGS_ARRAY,
  affectedResources = EMPTY_STRINGS_ARRAY,
  entityId,
  issue,
  onBack,
  onIgnore,
  organizationId,
  renderContentOnly,
  repoId,
  repoName,
  repoUrl,
  repoAvatarUrl,
}: SecurityIssueDetailsProps) {
  const [activeView, setActiveView] = useState<IssueDrawerView>("overview");
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const notesBottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const orgId = user?.organization?.id ?? organizationId;

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [recentlyCopiedNoteId, setRecentlyCopiedNoteId] = useState<string | null>(null);
  const [showConversationHeader, setShowConversationHeader] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!orgId || !entityId) return;
    try {
      const data = await notesService.getNotes(orgId, "security_issue", entityId);
      setNotes(data);
    } catch (error) {
      console.error("[notes] Failed to load notes:", { orgId, entityId, error });
    }
  }, [orgId, entityId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (activeView === "notes" && notes.length > 0) {
      notesBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [notes, activeView]);

  const handleSubmitNote = async () => {
    if (!orgId || !entityId || !newNoteBody.trim()) {
      toast.error("Cannot save note");
      return;
    }
    setIsSubmittingNote(true);
    try {
      await notesService.createNote(orgId, "security_issue", entityId, newNoteBody.trim());
      setNewNoteBody("");
      await loadNotes();
      toast.success("Comment added", { description: "Your comment has been posted" });
    } catch {
      toast.error("Failed to save note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!orgId || !editingNoteBody.trim()) return;
    setIsSubmittingNote(true);
    try {
      await notesService.updateNote(orgId, noteId, editingNoteBody.trim());
      setEditingNoteId(null);
      setEditingNoteBody("");
      await loadNotes();
    } catch {
      toast.error("Failed to update note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!orgId) return;
    try {
      await notesService.deleteNote(orgId, noteId);
      await loadNotes();
      toast.success("Comment removed", { description: "The comment has been deleted" });
    } catch {
      toast.error("Failed to delete note");
    }
  };

  useEffect(() => {
    setActiveView("overview");
  }, [issue?.rule, issue?.file, issue?.line, issue?.message]);

  if (!issue) return null;

  const { clearFix, error, fixResult, handleAnalyzeIssue, handleCreatePR, isAnalyzing, isCreatingPR, prUrl } =
    useIssueRemediation(issue, organizationId, repoId);

  const isPackageDependency = isPackageDependencyIssue(issue);
  const drawerTitle = isPackageDependency ? issue.rule : issue.message;

  const locationValue = issue.file
    ? `${issue.file}${issue.line == null ? "" : `:${String(issue.line)}`}`
    : `Line ${String(issue.line)}`;

  const hasDescription = !!(issue.description && issue.description !== issue.message);
  const hasConfidence = issue.issue_type !== "sast" && !!issue.metadata?.confidence;
  const hasTags = issue.issue_type !== "sast" && !!(issue.metadata?.owasp ?? issue.metadata?.cwe);
  const hasVulnerableCode = !!(issue.suggestion && !issue.suggestion.startsWith("http"));
  const hasRemediation = !!issue.remediation;

  const overviewCount =
    (isPackageDependency ? 0 : 1) +
    (hasDescription ? 1 : 0) +
    (hasConfidence ? 1 : 0) +
    (hasTags ? 1 : 0) +
    (hasRemediation ? 1 : 0) +
    (hasVulnerableCode ? 1 : 0);

  const affectedCount = affectedResources.length + affectedFiles.length;

  const showAutofix = isAutofixAvailable(issue);

  const drawerTabs: {
    count?: number;
    icon: typeof Shapes;
    id: IssueDrawerView;
    label: string;
  }[] = [{ count: overviewCount, icon: Shapes, id: "overview", label: "Overview" }];

  if (affectedCount > 0) {
    drawerTabs.push({ count: affectedCount, icon: GalleryVerticalEnd, id: "affected", label: "Affected" });
  }

  if (showAutofix) {
    drawerTabs.push({ icon: Bot, id: "autofix", label: "Autofix" });
  }

  drawerTabs.push({ icon: MessageSquare, id: "notes", label: "Comments" });

  const activeTabIsAvailable = drawerTabs.some((tab) => tab.id === activeView);
  const resolvedActiveView = activeTabIsAvailable ? activeView : "overview";

  const content = (
    <div className="flex h-full flex-col overflow-hidden">
      <IssueDrawerHeaderSection>
        <div className="min-w-0 flex-1">
          <IssueDrawerTitle>{drawerTitle}</IssueDrawerTitle>
          <div className="text-sm text-muted-foreground">
            {issue.issue_type ? <span>{getIssueTypeLabel(issue.issue_type)}</span> : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {onIgnore ? (
            <IssueDrawerIgnoreButton
              isIgnored={issue.status === "ignored" || issue.status === "auto_ignored"}
              onClick={onIgnore}
            />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setActiveView("notes");
              setTimeout(() => notesInputRef.current?.focus(), 100);
            }}
          >
            <MessageSquare className="size-4" />
            Comment
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Share coming soon")}>
            <Share2 className="size-4" />
          </Button>
        </div>
      </IssueDrawerHeaderSection>

      <IssueDrawerTabs activeTab={resolvedActiveView} className="mt-3" onTabChange={setActiveView} tabs={drawerTabs} />

      {resolvedActiveView === "notes" &&
      new Map(notes.filter((n) => n.author).map((n) => [n.author!.id, n.author!])).size >= 2 &&
      showConversationHeader ? (
        <div className="shrink-0 flex items-center justify-between border-b bg-blue-500/10 px-6 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">In this conversation</span>
            <div className="flex -space-x-1.5">
              {Array.from(new Map(notes.filter((n) => n.author).map((n) => [n.author!.id, n.author!])).values()).map(
                (author) => {
                  const src = author.avatar || getIdenticonUrl(author.id);
                  return (
                    <Avatar className="size-5 border-2 border-blue-500/10" key={author.id}>
                      {src ? <AvatarImage src={src} /> : null}
                      <AvatarFallback className="text-[8px]">
                        {author.first_name.charAt(0)}
                        {author.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  );
                },
              )}
            </div>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowConversationHeader(false)}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className={ISSUE_DRAWER_BODY_CLASS}>
        {resolvedActiveView === "overview" ? (
          <div className={ISSUE_DRAWER_SECTIONS_CLASS}>
            {hasDescription ? (
              <div className="text-sm leading-relaxed text-muted-foreground">
                <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                  {issue.description}
                </ReactMarkdown>
              </div>
            ) : null}

            <hr className="border-border/60" />

            <div className="grid grid-cols-3 gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-sm text-muted-foreground">Severity</div>
                <SeverityBadge severity={issue.severity} />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="text-sm text-muted-foreground">Repository</div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  {repoAvatarUrl ? (
                    <Avatar className="size-5 shrink-0">
                      <AvatarImage src={repoAvatarUrl} />
                      <AvatarFallback className="text-[8px]">
                        {(repoName ?? repoId ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                  <a
                    className="min-w-0 truncate text-foreground underline-offset-2 hover:underline"
                    href={repoUrl ?? `/assets/repositories/${repoId}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {repoName ?? repoId}
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-sm text-muted-foreground">Location</div>
                <button
                  className="block w-full min-w-0 truncate text-left text-sm text-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    void navigator.clipboard.writeText(locationValue);
                    toast.success("Copied", { description: "Location copied to clipboard" });
                  }}
                  type="button"
                >
                  {locationValue}
                </button>
              </div>
              <div className="min-w-0 space-y-1">
                <div className="text-sm text-muted-foreground">Rule</div>
                <div className="min-w-0 truncate text-sm text-foreground">{issue.rule}</div>
              </div>
              {issue.issue_type ? (
                <div className="min-w-0 space-y-1">
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="text-sm text-foreground">{getIssueTypeLabel(issue.issue_type)}</div>
                </div>
              ) : null}
            </div>

            {hasConfidence ? (
              <section className={ISSUE_DRAWER_SECTION_CLASS}>
                <IssueDrawerSectionHeading>Confidence</IssueDrawerSectionHeading>
                <IssueDrawerDetailItem icon={Shield} label={String(issue.metadata?.confidence ?? "")} />
              </section>
            ) : null}

            {hasTags ? (
              <section className={ISSUE_DRAWER_SECTION_CLASS}>
                <IssueDrawerSectionHeading>Tags</IssueDrawerSectionHeading>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {issue.metadata?.owasp
                    ? String(issue.metadata.owasp)
                        .split(",")
                        .map((tag, i) => (
                          <IssueDrawerDetailItem icon={Tag} key={`owasp-${String(i)}`} label={`OWASP: ${tag.trim()}`} />
                        ))
                    : null}
                  {issue.metadata?.cwe
                    ? String(issue.metadata.cwe)
                        .split(",")
                        .map((tag, i) => (
                          <IssueDrawerDetailItem icon={Tag} key={`cwe-${String(i)}`} label={`CWE: ${tag.trim()}`} />
                        ))
                    : null}
                </div>
              </section>
            ) : null}

            {hasRemediation && issue.issue_type !== "iac" && issue.issue_type !== "sast" ? (
              <section className={ISSUE_DRAWER_SECTION_CLASS}>
                <IssueDrawerSectionHeading>Remediation</IssueDrawerSectionHeading>
                <div className="text-sm leading-relaxed text-muted-foreground">
                  <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                    {issue.issue_type === "sast" && issue.tool === "semgrep"
                      ? `\`\`\`${issue.file.split(".").pop() ?? ""}\n${String(issue.remediation)}\n\`\`\``
                      : issue.remediation}
                  </ReactMarkdown>
                </div>
              </section>
            ) : null}

            {hasVulnerableCode ? (
              <section className={ISSUE_DRAWER_SECTION_CLASS}>
                <IssueDrawerSectionHeading>Vulnerable Code</IssueDrawerSectionHeading>
                <IssueDrawerCodeBlock>{issue.suggestion}</IssueDrawerCodeBlock>
              </section>
            ) : null}
          </div>
        ) : resolvedActiveView === "autofix" ? (
          <div className={ISSUE_DRAWER_SECTIONS_CLASS}>
            {fixResult ? (
              <AiFixDialog
                actionsInFooter
                error={error}
                filePath={issue.file}
                fixResult={fixResult}
                inline
                isCreatingPR={isCreatingPR}
                issueTitle={issue.message}
                onCreatePR={() => void handleCreatePR()}
                onDiscard={clearFix}
                onOpenChange={() => {}}
                open={false}
                prUrl={prUrl}
                startLine={issue.line}
                vulnerableCode={issue.suggestion ?? undefined}
              />
            ) : error ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
                <Button onClick={() => void handleAnalyzeIssue()} size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            ) : (
              <State.Empty
                action={
                  <Button
                    className="h-8 gap-2 shadow-sm"
                    disabled={isAnalyzing}
                    onClick={() => void handleAnalyzeIssue()}
                    size="sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <Spinner className="size-3.5" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Bot className="size-3.5" />
                        Generate Fix
                      </>
                    )}
                  </Button>
                }
                description="Use AI to analyze this vulnerability and generate a fix suggestion. The fix can be reviewed and applied as a pull request."
                fillPage={false}
                icon={Bot}
                title="AI-Generated Fix"
              />
            )}
          </div>
        ) : resolvedActiveView === "notes" ? (
          <div className="flex h-full min-h-0 flex-col">
            {notes.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div className="flex flex-col items-center">
                  <MessageSquare className="mb-3 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {notes.map((note) => {
                  const isOwn = note.author?.id === user?.id;
                  const avatarSrc = note.author?.avatar || (note.author ? getIdenticonUrl(note.author.id) : undefined);
                  return (
                    <Message align={isOwn ? "end" : "start"} className="group" key={note.id}>
                      <MessageAvatar>
                        <Avatar className="size-8">
                          {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
                          <AvatarFallback className="text-xs">
                            {note.author
                              ? `${note.author.first_name.charAt(0)}${note.author.last_name.charAt(0)}`
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        {editingNoteId === note.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                              onChange={(e) => {
                                setEditingNoteBody(e.target.value);
                              }}
                              value={editingNoteBody}
                            />
                            <div className="flex justify-end gap-1">
                              <Button
                                onClick={() => {
                                  setEditingNoteId(null);
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                              <Button
                                disabled={isSubmittingNote || !editingNoteBody.trim()}
                                onClick={() => {
                                  void handleUpdateNote(note.id);
                                }}
                                size="sm"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <MessageHeader className="text-xs font-medium">
                              {note.author ? `${note.author.first_name} ${note.author.last_name}`.trim() : "Unknown"}
                            </MessageHeader>
                            <Bubble className={isOwn ? "bg-primary text-primary-foreground" : ""}>
                              <BubbleContent>{note.body}</BubbleContent>
                            </Bubble>
                            <MessageFooter>
                              {isOwn || user?.role === "owner" ? (
                                <>
                                  <div className="flex items-center gap-1 opacity-0 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-y-0">
                                    <Button
                                      aria-label="Copy note"
                                      className="size-6"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(note.body);
                                        setRecentlyCopiedNoteId(note.id);
                                        toast.success("Copied", { description: "Note copied to clipboard" });
                                        setTimeout(() => setRecentlyCopiedNoteId(null), 2000);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      {recentlyCopiedNoteId === note.id ? (
                                        <Check className="size-3" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </Button>
                                    <Button
                                      aria-label="Edit note"
                                      className="size-6"
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditingNoteBody(note.body);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Pencil className="size-3" />
                                    </Button>
                                    <Button
                                      aria-label="Delete note"
                                      className="size-6 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        void handleDeleteNote(note.id);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                  <span className="ml-auto">
                                    {new Date(note.created_at).toLocaleDateString(undefined, {
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>
                                    {new Date(note.created_at).toLocaleDateString(undefined, {
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                  <div className="ml-auto opacity-0 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-y-0">
                                    <Button
                                      aria-label="Copy note"
                                      className="size-6"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(note.body);
                                        setRecentlyCopiedNoteId(note.id);
                                        toast.success("Copied", { description: "Note copied to clipboard" });
                                        setTimeout(() => setRecentlyCopiedNoteId(null), 2000);
                                      }}
                                      size="icon"
                                      variant="ghost"
                                    >
                                      {recentlyCopiedNoteId === note.id ? (
                                        <Check className="size-3" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </Button>
                                  </div>
                                </>
                              )}
                            </MessageFooter>
                          </>
                        )}
                      </MessageContent>
                    </Message>
                  );
                })}
                <div ref={notesBottomRef} />
              </div>
            )}
            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <textarea
                  className="h-[72px] w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-2.5 pr-[88px] text-sm outline-none placeholder:text-muted-foreground transition-shadow selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/20"
                  onChange={(e) => {
                    setNewNoteBody(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmitNote();
                    }
                  }}
                  placeholder="Write a comment..."
                  ref={notesInputRef}
                  value={newNoteBody}
                />
                <Button
                  className="absolute bottom-1.5 right-1.5 h-8 gap-1 rounded-md border bg-muted/50 px-2 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
                  disabled={isSubmittingNote || !newNoteBody.trim()}
                  onClick={() => {
                    void handleSubmitNote();
                  }}
                  type="button"
                >
                  Send
                  <kbd className="flex items-center rounded bg-muted/70 px-1 py-0.5 text-[10px] text-muted-foreground">
                    ⏎
                  </kbd>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className={ISSUE_DRAWER_SECTIONS_CLASS}>
            {affectedResources.length > 0 ? (
              <section className={ISSUE_DRAWER_SECTION_CLASS}>
                <IssueDrawerSectionHeading>Affected Resources</IssueDrawerSectionHeading>
                <IssueDrawerAffectedResourcesTable
                  onCopy={(resource) => {
                    void navigator.clipboard.writeText(resource);
                    toast.success("Copied", { description: "Resource ARN copied to clipboard" });
                  }}
                  resources={affectedResources}
                />
              </section>
            ) : null}

            {affectedFiles.length > 0 ? (
              <section className={ISSUE_DRAWER_SECTION_CLASS}>
                <IssueDrawerSectionHeading>Affected Files</IssueDrawerSectionHeading>
                <IssueDrawerAffectedFilesTable
                  files={affectedFiles}
                  onCopy={(file) => {
                    void navigator.clipboard.writeText(file);
                    toast.success("Copied", { description: "File path copied to clipboard" });
                  }}
                />
              </section>
            ) : null}
          </div>
        )}
      </div>

      <IssueDrawerFooter onBack={onBack}>
        {resolvedActiveView === "autofix" && fixResult && !prUrl ? (
          <AiFixDialogActions
            fixCode={fixResult.fix_code}
            isCreatingPR={isCreatingPR}
            onCreatePR={() => void handleCreatePR()}
            onDiscard={clearFix}
          />
        ) : null}
      </IssueDrawerFooter>
    </div>
  );

  if (renderContentOnly) {
    return content;
  }

  return (
    <DrawerContent className={cn(detailDrawerSurfaceClassName, "flex flex-col p-0 outline-none")} side="right">
      {content}
    </DrawerContent>
  );
}

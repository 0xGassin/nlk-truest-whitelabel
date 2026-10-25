"use client";

import type { LincColorPreset } from "@/components/linc-avatar";
import type { AssistantMessage, AssistantThread, ThinkingStep } from "@/services/api/assistant";

import { ArrowDownIcon, ArrowUpIcon, Cog, LoaderIcon, Menu, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EmptyState } from "@/components/elements/empty-state";
import { ReasoningPanel } from "@/components/elements/reasoning-panel";
import { ToolCall } from "@/components/elements/tool-call";
import { DEFAULT_LINC_COLOR, LINC_COLORS, LincAvatar } from "@/components/linc-avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Graphql } from "@/components/ui/svgs/graphql";
import { getOrganizationId } from "@/lib/organization";
import { field, floating, ghostButton, inkButton, mono, pressable } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { createThread, getMessages, listThreads, sendMessage } from "@/services/api/assistant";
import { useAuthStore } from "@/stores/auth-store";
import { useLincColor } from "@/stores/linc-color-store";

interface ChatTurn {
  content: string;
  graphqlQuery?: string;
  graphqlResult?: unknown;
  id: string;
  isError?: boolean;
  role: "assistant" | "user";
  thinking?: ThinkingStep[];
}

const SUGGESTED_PROMPTS = [
  "What are the most severe lookalikes?",
  "Show me the most critical findings to fix first.",
  "Summarize the attack surface for this organization.",
  "Which domains have the highest risk?",
];

const GREETINGS = [
  "Hi! What are we doing today?",
  "Hey! What should we work on?",
  "Hello! What's on your mind?",
  "Hi there! Where should we dig in?",
];

const BEEP_BOOP = "Beep Boop...";
const BEEP_BOOP_CHANCE = 0.07;
const THREAD_LIST_ENABLED = false;
const GREETING_PATTERN = /^(hi|hello|hey|yo|hiya|hi there|hello there|good (morning|afternoon|evening))[\s!.,]*$/i;
const GREETING_REPLY = "Hi! How can I assist you today?";

function plainPreview(markdown: string): string {
  return markdown
    .replaceAll(/^#{1,6}\s+/gm, "")
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replaceAll(/\*\*([^*]+)\*\*/g, "$1")
    .replaceAll(/`([^`]+)`/g, "$1");
}

function shortQuery(query: string): string {
  const firstLine = (query.split("\n", 1)[0] ?? query).trim();
  return firstLine.length > 24 ? `${firstLine.slice(0, 21)}...` : firstLine;
}

function GraphqlAction({ turn }: { turn: ChatTurn }) {
  const [open, setOpen] = useState(false);

  if (!turn.graphqlQuery) return null;

  return (
    <ToolCall
      activeLabel="Generating GraphQL"
      icon={<Graphql className="size-3.5" />}
      label="Generated GraphQL"
      onOpenChange={setOpen}
      open={open}
      query={shortQuery(turn.graphqlQuery)}
      running={false}
    >
      <div className="rounded-xl bg-foreground/[0.03] px-2.5 py-2">
        <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {turn.graphqlQuery}
        </pre>
        {turn.graphqlResult !== undefined && (
          <>
            <div className="my-2 border-t border-foreground/[0.06]" />
            <p className={cn(mono, "mb-1 text-foreground/35")}>Result</p>
            <pre className="max-h-40 overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(turn.graphqlResult, null, 2)}
            </pre>
          </>
        )}
      </div>
    </ToolCall>
  );
}

function ThinkingPanel({ turn }: { turn: ChatTurn }) {
  const [open, setOpen] = useState(false);

  if (!turn.thinking || turn.thinking.length === 0) return null;

  const steps = turn.thinking.map((step) => ({
    body: step.purpose ?? step.graphql_query ?? "",
    title: step.step,
  }));
  const count = steps.length;

  return (
    <ReasoningPanel
      onOpenChange={setOpen}
      open={open}
      restingLabel={`Thought through ${String(count)} ${count === 1 ? "step" : "steps"}`}
      steps={steps}
      streaming={false}
      visibleSteps={steps.length}
    />
  );
}

function AssistantMessage({ color, turn }: { color: LincColorPreset; turn: ChatTurn }) {
  return (
    <div className="fade-in animate-in slide-in-from-bottom-2 flex max-w-[85%] items-start gap-2.5 duration-300">
      <LincAvatar className="mt-0.5 size-7" color={color} />
      <div className="min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-md bg-foreground/[0.04] px-3.5 py-2.5">
        <div
          className={cn(
            "text-[13px] leading-relaxed [&_a]:underline",
            turn.isError ? "text-destructive" : "text-foreground/80",
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
        </div>
        {turn.thinking && turn.thinking.length > 0 && <ThinkingPanel turn={turn} />}
        {turn.graphqlQuery && <GraphqlAction turn={turn} />}
      </div>
    </div>
  );
}

function AssistantAvatar({ color }: { color: LincColorPreset }) {
  return <LincAvatar className="mt-0.5 size-7" color={color} />;
}

function messageToTurn(message: AssistantMessage): ChatTurn {
  return {
    content: message.content,
    graphqlQuery: message.graphql_query,
    graphqlResult: message.graphql_result,
    id: message.id,
    role: message.role,
    thinking: message.thinking,
  };
}

function formatThreadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date);
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /\b404\b/.test(error.message);
}

interface ThreadListProps {
  activeThreadId: null | string;
  error: null | string;
  isLoading: boolean;
  onNewThread: () => void;
  onSelectThread: (thread: AssistantThread) => void;
  threads: AssistantThread[];
}

function ThreadList({ activeThreadId, error, isLoading, onNewThread, onSelectThread, threads }: ThreadListProps) {
  return (
    <div className="absolute top-11 left-2 flex max-h-[min(420px,calc(100vh-7rem))] w-72 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.38)]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-foreground/[0.06] px-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">Threads</p>
        </div>
        <button
          aria-label="New thread"
          className={cn(ghostButton, "size-7 shrink-0")}
          onClick={onNewThread}
          type="button"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="flex items-center gap-2 px-2.5 py-4 text-[12px] text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin" />
            Loading threads...
          </div>
        ) : error ? (
          <p className="px-2.5 py-4 text-[12px] leading-relaxed text-destructive">{error}</p>
        ) : threads.length === 0 ? (
          <p className="px-2.5 py-3 text-[14px] font-normal text-muted-foreground">No threads...</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {threads.map((thread) => (
              <button
                aria-current={thread.id === activeThreadId ? "true" : undefined}
                className={cn(
                  "flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                  thread.id === activeThreadId && "bg-accent/70 text-accent-foreground",
                )}
                key={thread.id}
                onClick={() => {
                  onSelectThread(thread);
                }}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-normal">{thread.title || "New Chat"}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatThreadDate(thread.updated_at || thread.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AssistantChatProps {
  onClose: () => void;
  organizationId: string;
}

function AssistantChat({ onClose, organizationId }: AssistantChatProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isThreadListOpen, setIsThreadListOpen] = useState(false);
  const [threads, setThreads] = useState<AssistantThread[]>([]);
  const [threadsError, setThreadsError] = useState<null | string>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [threadId, setThreadId] = useState<null | string>(null);
  const [streaming, setStreaming] = useState<null | string>(null);
  const [visibleWords, setVisibleWords] = useState(0);
  const [greeting, setGreeting] = useState<string>(GREETINGS[0]);
  const greetingCursorRef = useRef(0);
  const lastWasBeepBoopRef = useRef(false);
  const seqRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const revealRef = useRef<null | ReturnType<typeof setInterval>>(null);
  const threadsLoadedRef = useRef(false);
  const threadsLoadingRef = useRef(false);
  const threadListCloseRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [seenTurnCount, setSeenTurnCount] = useState(0);
  const avatarColorKey = useLincColor((state) => state.colorKey);
  const selectAvatarColor = useLincColor((state) => state.selectColor);
  const avatarColor = LINC_COLORS.find((preset) => preset.key === avatarColorKey) ?? DEFAULT_LINC_COLOR;

  const turnCount = turns.length + (streaming === null ? 0 : 1) + (isThinking && streaming === null ? 1 : 0);

  useEffect(() => {
    const idx = greetingCursorRef.current % GREETINGS.length;
    greetingCursorRef.current += 1;
    let next = GREETINGS[idx] ?? GREETINGS[0];
    const shouldBeepBoop = Math.random() < BEEP_BOOP_CHANCE && !lastWasBeepBoopRef.current;
    lastWasBeepBoopRef.current = shouldBeepBoop;
    if (shouldBeepBoop) next = BEEP_BOOP;
    setGreeting(next);
  }, []);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    setPinnedToBottom(atBottom);
  }, []);

  const jumpToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ behavior: "smooth", top: element.scrollHeight });
    setPinnedToBottom(true);
    setSeenTurnCount(turnCount);
  }, [turnCount]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (pinnedToBottom) {
      element.scrollTop = element.scrollHeight;
      setSeenTurnCount(turnCount);
    }
  }, [pinnedToBottom, turnCount, visibleWords]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clearConversation = useCallback(() => {
    if (revealRef.current) clearInterval(revealRef.current);
    revealRef.current = null;
    seqRef.current += 1;
    setStreaming(null);
    setTurns([]);
    setThreadId(null);
    setIsThinking(false);
    setIsLoadingThread(false);
    setPinnedToBottom(true);
    setSeenTurnCount(0);
  }, []);

  const loadThreads = useCallback(async () => {
    if (threadsLoadedRef.current || threadsLoadingRef.current) return;

    threadsLoadingRef.current = true;
    setIsLoadingThreads(true);
    setThreadsError(null);
    try {
      const result = await listThreads(organizationId);
      setThreads(
        result.toSorted(
          (left, right) =>
            new Date(right.updated_at || right.created_at).getTime() -
            new Date(left.updated_at || left.created_at).getTime(),
        ),
      );
      threadsLoadedRef.current = true;
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        setThreads([]);
        setThreadsError(null);
        threadsLoadedRef.current = true;
      } else {
        setThreadsError("Unable to load conversations.");
      }
    } finally {
      threadsLoadingRef.current = false;
      setIsLoadingThreads(false);
    }
  }, [organizationId]);

  const showThreadList = useCallback(() => {
    if (threadListCloseRef.current) clearTimeout(threadListCloseRef.current);
    setIsThreadListOpen(true);
    void loadThreads();
  }, [loadThreads]);

  const hideThreadList = useCallback(() => {
    if (threadListCloseRef.current) clearTimeout(threadListCloseRef.current);
    threadListCloseRef.current = setTimeout(() => {
      setIsThreadListOpen(false);
    }, 140);
  }, []);

  const handleNewThread = useCallback(() => {
    clearConversation();
    setIsThreadListOpen(false);
    inputRef.current?.focus();
  }, [clearConversation]);

  const handleSelectThread = useCallback(
    async (thread: AssistantThread) => {
      if (thread.id === threadId) {
        setIsThreadListOpen(false);
        return;
      }

      if (revealRef.current) clearInterval(revealRef.current);
      revealRef.current = null;
      const sequence = ++seqRef.current;
      setStreaming(null);
      setIsThinking(false);
      setIsLoadingThread(true);
      setInput("");

      try {
        const messages = await getMessages(organizationId, thread.id);
        if (seqRef.current !== sequence) return;
        setTurns(messages.map(messageToTurn));
        setThreadId(thread.id);
        setPinnedToBottom(true);
        setSeenTurnCount(messages.length);
        setIsThreadListOpen(false);
      } catch (error: unknown) {
        if (seqRef.current !== sequence) return;
        setTurns([
          {
            content: error instanceof Error ? error.message : "Unable to load this conversation.",
            id: crypto.randomUUID(),
            isError: true,
            role: "assistant",
          },
        ]);
      } finally {
        if (seqRef.current === sequence) setIsLoadingThread(false);
      }
    },
    [organizationId, threadId],
  );

  useEffect(
    () => () => {
      if (threadListCloseRef.current) clearTimeout(threadListCloseRef.current);
    },
    [],
  );

  useEffect(
    () => () => {
      if (revealRef.current) clearInterval(revealRef.current);
      seqRef.current += 1;
    },
    [],
  );

  const handleSend = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isThinking || isLoadingThread) return;

      setInput("");
      setTurns((previous) => [...previous, { content: trimmed, id: crypto.randomUUID(), role: "user" }]);

      if (GREETING_PATTERN.test(trimmed)) {
        setTurns((previous) => [...previous, { content: GREETING_REPLY, id: crypto.randomUUID(), role: "assistant" }]);
        return;
      }

      setIsThinking(true);
      const sequence = ++seqRef.current;

      try {
        let currentThreadId = threadId;
        if (!currentThreadId) {
          const title = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
          const thread = await createThread(organizationId, title);
          if (seqRef.current !== sequence) return;
          currentThreadId = thread.id;
          setThreadId(currentThreadId);
          setThreads((previous) => [thread, ...previous.filter((item) => item.id !== thread.id)]);
        }

        const reply = await sendMessage(organizationId, currentThreadId, trimmed);
        if (seqRef.current !== sequence) return;

        const turn: ChatTurn = {
          content: reply.content,
          graphqlQuery: reply.graphql_query,
          graphqlResult: reply.graphql_result,
          id: crypto.randomUUID(),
          role: "assistant",
          thinking: reply.thinking,
        };
        const words = plainPreview(reply.content).split(" ");
        const interval = Math.max(6, Math.min(28, Math.round(2600 / words.length)));
        setStreaming(reply.content);
        setVisibleWords(0);
        let index = 0;
        revealRef.current = setInterval(() => {
          index += 1;
          setVisibleWords(index);
          if (index >= words.length) {
            if (revealRef.current) clearInterval(revealRef.current);
            revealRef.current = null;
            setStreaming(null);
            setTurns((previous) => [...previous, turn]);
            setIsThinking(false);
          }
        }, interval);
      } catch (error: unknown) {
        if (seqRef.current !== sequence) return;
        setTurns((previous) => [
          ...previous,
          {
            content: error instanceof Error ? error.message : String(error),
            id: crypto.randomUUID(),
            isError: true,
            role: "assistant",
          },
        ]);
        setIsThinking(false);
      }
    },
    [isLoadingThread, isThinking, organizationId, threadId],
  );

  const isEmpty = turns.length === 0 && streaming === null;

  return (
    <div
      aria-label="Linc assistant"
      className={cn(
        floating,
        "animate-in fade-in slide-in-from-top-3 zoom-in-95 fixed top-[4.25rem] right-4 bottom-4 z-50 flex w-[min(640px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[14px] border border-border ring-1 ring-border/10 duration-300 ring-inset",
      )}
      role="dialog"
    >
      {THREAD_LIST_ENABLED ? (
        <div
          className="absolute inset-y-0 left-0 z-30 w-12 overflow-visible"
          onMouseEnter={showThreadList}
          onMouseLeave={hideThreadList}
        >
          <button
            aria-expanded={isThreadListOpen}
            aria-label="Show conversations"
            className={cn(
              ghostButton,
              "absolute top-3 left-3 z-40 size-7",
              isThreadListOpen && "bg-foreground/[0.06] text-foreground/90",
            )}
            onClick={() => {
              if (isThreadListOpen) {
                setIsThreadListOpen(false);
              } else {
                showThreadList();
              }
            }}
            type="button"
          >
            <Menu className="size-4" />
          </button>
          {isThreadListOpen ? (
            <ThreadList
              activeThreadId={threadId}
              error={threadsError}
              isLoading={isLoadingThreads}
              onNewThread={handleNewThread}
              onSelectThread={(thread) => {
                void handleSelectThread(thread);
              }}
              threads={threads}
            />
          ) : null}
        </div>
      ) : null}

      <button
        aria-label="Close Linc"
        className={cn(ghostButton, "absolute top-3 right-3 z-10 size-7")}
        onClick={onClose}
        type="button"
      >
        <X className="size-4" />
      </button>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative flex-1 overflow-y-auto" onScroll={handleScroll} ref={scrollRef}>
          <div className="flex min-h-full flex-col justify-end gap-2.5 px-4 pt-8 pb-7">
            {isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
                <LincAvatar className="size-14" color={avatarColor} />
                <EmptyState
                  greeting={greeting}
                  hideComposer
                  onSuggestion={(suggestion) => {
                    void handleSend(suggestion);
                  }}
                  suggestions={SUGGESTED_PROMPTS}
                />
              </div>
            ) : (
              turns.map((turn) =>
                turn.role === "user" ? (
                  <div
                    className="fade-in animate-in slide-in-from-bottom-2 max-w-[80%] self-end rounded-2xl rounded-br-md bg-foreground/[0.06] px-3.5 py-2 text-[13px] text-foreground duration-300"
                    key={turn.id}
                  >
                    {turn.content}
                  </div>
                ) : (
                  <AssistantMessage color={avatarColor} key={turn.id} turn={turn} />
                ),
              )
            )}

            {isThinking && streaming === null && (
              <div className="fade-in animate-in flex max-w-[85%] items-start gap-2.5 duration-300">
                <AssistantAvatar color={avatarColor} />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-foreground/[0.04] px-4 py-3">
                  {["-0.32s", "-0.16s", "0s"].map((delay) => (
                    <span
                      aria-hidden
                      className="size-1 animate-bounce rounded-full bg-foreground/40 motion-reduce:animate-none"
                      key={delay}
                      style={{ animationDelay: delay, animationDuration: "1.1s" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {streaming !== null && (
              <div className="fade-in animate-in flex max-w-[85%] items-start gap-2.5 duration-300">
                <AssistantAvatar color={avatarColor} />
                <div className="rounded-2xl rounded-tl-md bg-foreground/[0.04] px-3.5 py-2.5">
                  <p className="text-[13px] leading-relaxed text-foreground/70">
                    {plainPreview(streaming)
                      .split(" ")
                      .slice(0, visibleWords)
                      .map((word, index) => {
                        const fresh = visibleWords - 1 - index < 2;
                        return (
                          <span
                            className="animate-in fade-in duration-500 motion-reduce:animate-none"
                            key={`${word}-${String(index)}`}
                          >
                            <span
                              className={cn(
                                "transition-colors duration-700 motion-reduce:transition-none",
                                fresh && "text-blue-500 dark:text-blue-400",
                              )}
                            >
                              {word}
                            </span>{" "}
                          </span>
                        );
                      })}
                    <span
                      aria-hidden
                      className="-mb-0.5 ml-0.5 inline-block h-3 w-0.5 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400"
                    />
                  </p>
                </div>
              </div>
            )}
          </div>

          {!pinnedToBottom && turnCount - seenTurnCount > 0 && (
            <button
              className={cn(
                floating,
                "fade-in slide-in-from-bottom-2 animate-in absolute inset-x-0 bottom-3 z-10 mx-auto flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-transform duration-200 hover:-translate-y-px",
              )}
              onClick={jumpToBottom}
              type="button"
            >
              <ArrowDownIcon className="size-3 opacity-60" />
              {turnCount - seenTurnCount} new {turnCount - seenTurnCount === 1 ? "message" : "messages"}
            </button>
          )}
        </div>

        <div className="border-t border-foreground/[0.06] p-3">
          <div className="flex items-center gap-2">
            <div className={cn(field, "flex h-10 min-w-0 flex-1 items-center rounded-full py-1.5 ps-4 pe-1.5")}>
              <input
                className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/35 disabled:opacity-50"
                disabled={isThinking || isLoadingThread}
                onChange={(event) => {
                  setInput(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSend(input);
                  }
                }}
                placeholder="Ask Linc about your surface..."
                ref={inputRef}
                spellCheck={false}
                type="text"
                value={input}
              />
              <button
                aria-label="Send message"
                className={cn(
                  inkButton,
                  pressable,
                  "flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 disabled:opacity-40",
                )}
                disabled={isThinking || isLoadingThread || !input.trim()}
                onClick={() => {
                  void handleSend(input);
                }}
                type="button"
              >
                <ArrowUpIcon className="size-3.5" />
              </button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button aria-label="Linc settings" className={cn(ghostButton, "size-8 shrink-0")} type="button">
                  <Cog className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80" side="top">
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 px-0.5 text-[10px] font-medium tracking-wider text-foreground/45 uppercase">
                      Avatar
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {LINC_COLORS.map((preset) => (
                        <button
                          className="group flex flex-col items-center gap-1 rounded-md px-1 py-1.5 transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04]"
                          key={preset.key}
                          onClick={() => {
                            selectAvatarColor(preset.key);
                          }}
                          type="button"
                        >
                          <span
                            className={cn(
                              "rounded-full transition-transform duration-150 group-hover:scale-105",
                              avatarColor.key === preset.key && "ring-2 ring-foreground/60",
                            )}
                          >
                            <LincAvatar className="size-7" color={preset} />
                          </span>
                          <span
                            className={cn(
                              "text-[11px] leading-none font-medium tracking-wide",
                              avatarColor.key === preset.key ? "text-foreground/90" : "text-foreground/50",
                            )}
                          >
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-foreground/[0.06] pt-1.5">
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground/80 transition-colors select-none hover:bg-accent hover:text-accent-foreground"
                      onClick={clearConversation}
                      type="button"
                    >
                      <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
                      Clear conversation
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground/80 transition-colors select-none hover:bg-accent hover:text-accent-foreground"
                      onClick={onClose}
                      type="button"
                    >
                      <X className="size-4 shrink-0 text-muted-foreground" />
                      Close Linc
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LincAssistant() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const organizationId = getOrganizationId(user);
  const colorKey = useLincColor((state) => state.colorKey);
  const color = LINC_COLORS.find((preset) => preset.key === colorKey) ?? DEFAULT_LINC_COLOR;

  return (
    <>
      <Button
        aria-expanded={open}
        aria-label={open ? "Close Linc assistant" : "Open Linc assistant"}
        className={cn(
          "h-9 min-h-9 max-h-9 border-[#eaeaea] bg-white px-4 leading-none text-black shadow-none transition-colors duration-150 hover:border-[#d4d4d4] hover:bg-[#f1f1f1] hover:text-black active:bg-[#eaeaea] dark:border-border dark:bg-white dark:text-black dark:hover:border-[#cccccc] dark:hover:bg-[#e8e8e8] dark:hover:text-black dark:active:bg-[#dedede]",
          open && "ring-2 ring-foreground/15",
        )}
        disabled={!organizationId}
        onClick={() => {
          setOpen((current) => !current);
        }}
        size="default"
        variant={open ? "default" : "outline"}
      >
        <span className="mr-2 rounded-full border border-foreground/25">
          <LincAvatar className="size-5" color={color} shadow={false} />
        </span>
        <span className="text-[14px] font-normal">Ask Linc</span>
      </Button>

      {open && organizationId ? (
        <AssistantChat
          onClose={() => {
            setOpen(false);
          }}
          organizationId={organizationId}
        />
      ) : null}
    </>
  );
}

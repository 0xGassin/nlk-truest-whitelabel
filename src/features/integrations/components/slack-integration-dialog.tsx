"use client";

import type { SlackChannel, SlackConnectionStatus, SlackNotificationRule } from "@/features/integrations";

import { ArrowRight, Check, RefreshCw, Unlink } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast/toast";
import { slackApi } from "@/features/integrations";
import { useAuth } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { integrationDialogContentClassName } from "./dialog-shell";

interface SlackIntegrationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const sources: { id: string; label: string }[] = [
  { id: "cspm", label: "Cloud (CSPM)" },
  { id: "repo", label: "Repositories" },
  { id: "container", label: "Containers" },
];

const severities = ["critical", "high", "medium", "low"];

const defaultRules = (): SlackNotificationRule[] =>
  sources.flatMap((source) => severities.map((severity) => ({ enabled: true, severity, source: source.id })));

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
        fill="#36C5F0"
      />
      <path
        d="M6.313 15.165a2.527 2.527 0 0 1 2.52-2.52 2.527 2.527 0 0 1 2.52 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.52-2.522v-6.313z"
        fill="#36C5F0"
      />
      <path
        d="M8.833 5.042a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.833 0a2.528 2.528 0 0 1 2.52 2.522v2.52H8.833z"
        fill="#2EB67D"
      />
      <path
        d="M8.833 6.313a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.52H2.52A2.527 2.527 0 0 1 0 8.833a2.527 2.527 0 0 1 2.522-2.52h6.311z"
        fill="#2EB67D"
      />
      <path
        d="M18.956 8.833a2.528 2.528 0 0 1 2.522-2.52A2.528 2.528 0 0 1 24 8.833a2.527 2.527 0 0 1-2.522 2.52h-2.522V8.833z"
        fill="#ECB22E"
      />
      <path
        d="M17.688 8.833a2.527 2.527 0 0 1-2.52 2.52 2.527 2.527 0 0 1-2.52-2.52V2.52A2.527 2.527 0 0 1 15.168 0a2.528 2.528 0 0 1 2.52 2.522v6.311z"
        fill="#ECB22E"
      />
      <path
        d="M15.168 18.956a2.528 2.528 0 0 1 2.52 2.522A2.528 2.528 0 0 1 15.168 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z"
        fill="#E01E5A"
      />
      <path
        d="M15.168 17.688a2.527 2.527 0 0 1-2.52-2.52 2.527 2.527 0 0 1 2.52-2.52h6.311A2.528 2.528 0 0 1 24 15.168a2.528 2.528 0 0 1-2.522 2.52h-6.31z"
        fill="#E01E5A"
      />
    </svg>
  );
}

export function SlackIntegrationDialog({ onOpenChange, open }: SlackIntegrationDialogProps) {
  const { user } = useAuth();
  const orgId = user?.organization?.id ?? user?.organization_id ?? "";

  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<null | SlackConnectionStatus>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [rules, setRules] = useState<SlackNotificationRule[]>(defaultRules);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isChecking = status === null;

  useEffect(() => {
    if (!open || !orgId) return;
    void (async () => {
      try {
        const connection = await slackApi.verify(orgId);
        setStatus(connection);
        if (connection.channel_id) {
          setSelectedChannel(connection.channel_id);
        }
        if (connection.connected) {
          const [channelsResult, rulesResult] = await Promise.all([
            slackApi.getChannels(orgId),
            slackApi.getRules(orgId),
          ]);
          setChannels(channelsResult);
          const merged = defaultRules().map((rule) => {
            const persisted = rulesResult.find((r) => r.source === rule.source && r.severity === rule.severity);
            return persisted ? { ...rule, enabled: persisted.enabled } : rule;
          });
          setRules(merged);
        }
      } catch (error) {
        const apiError = parseApiError(error);
        logger.error("Failed to load Slack connection status", { error: apiError.message });
        setStatus({ connected: false });
      }
    })();
  }, [open, orgId]);

  const handleRefreshChannels = async () => {
    if (!orgId) return;
    try {
      setChannels(await slackApi.getChannels(orgId));
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to refresh Slack channels", { error: apiError.message });
      toast.error("Failed to refresh channels", { description: apiError.message });
    }
  };

  const handleConnect = async () => {
    if (!orgId) return;
    setIsConnecting(true);
    try {
      const url = await slackApi.connect(orgId);
      globalThis.location.href = url;
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to generate Slack connection link", { error: apiError.message });
      toast.error(apiError.message, {
        description: "We could not redirect you to Slack at this time.",
      });
      setIsConnecting(false);
    }
  };

  const handleChannelChange = async (channelId: string) => {
    setSelectedChannel(channelId);
    if (!orgId) return;
    const channel = channels.find((c) => c.id === channelId);
    try {
      await slackApi.setChannel(orgId, channelId, channel?.name ?? "");
      setStatus((prev) => {
        const current = prev ?? { connected: false };
        return { ...current, channel_id: channelId, channel_name: channel?.name };
      });
      toast.success("Alert channel updated", {
        description: channel ? `Alerts will be sent to #${channel.name}.` : undefined,
      });
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to set Slack channel", { error: apiError.message });
      toast.error("Failed to update channel", { description: apiError.message });
    }
  };

  const toggleRule = (source: string, severity: string, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.source === source && r.severity === severity ? { ...r, enabled } : r)));
  };

  const handleSaveRules = async () => {
    if (!orgId) return;
    setIsSaving(true);
    try {
      await slackApi.updateRules(orgId, rules);
      toast.success("Notification rules saved");
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to update Slack notification rules", { error: apiError.message });
      toast.error("Failed to save notification rules", { description: apiError.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!orgId) return;
    const confirmed = confirm(
      "Disconnect Slack from NuLink? You will stop receiving security alerts until you reconnect.",
    );
    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await slackApi.disconnect(orgId);
      setStatus({ connected: false });
      setChannels([]);
      setSelectedChannel("");
      setRules(defaultRules());
      toast.success("Slack disconnected");
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to disconnect Slack", { error: apiError.message });
      toast.error("Failed to disconnect Slack", { description: apiError.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={integrationDialogContentClassName}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#611f69]">
                <SlackIcon className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">Connect Slack</DialogTitle>
                <DialogDescription className="mt-1 text-muted-foreground">
                  Send security alerts for your cloud, repository, and container findings to a Slack channel.
                </DialogDescription>
              </div>
            </div>

            {isChecking ? (
              <div className="flex justify-center py-12">
                <Spinner className="size-8 text-muted-foreground" />
              </div>
            ) : status.connected ? (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
                <div className="flex items-center gap-3 rounded-lg border border-green-500/10 bg-green-500/5 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-green-200 bg-background text-green-600 dark:border-green-800 dark:text-green-400">
                    <SlackIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium">{status.team_name ?? "Slack Workspace"}</h4>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      Connected
                    </p>
                  </div>
                  <Button
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={isDisconnecting}
                    onClick={() => {
                      void handleDisconnect();
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {isDisconnecting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <>
                        <Unlink className="mr-1.5 size-4" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Alert channel</h4>
                    <Button
                      onClick={() => {
                        void handleRefreshChannels();
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <RefreshCw className="mr-1.5 size-3.5" />
                      Refresh
                    </Button>
                  </div>
                  <Select
                    onValueChange={(value) => void handleChannelChange(value)}
                    value={selectedChannel || undefined}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.private ? "🔒 " : "#"}
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {status.channel_id ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-green-500" />
                      Alerts will be sent to {status.channel_name ? `#${status.channel_name}` : "the selected channel"}.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Notification rules</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose which severity levels trigger alerts for each source.
                  </p>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] items-center gap-2 border-b bg-muted/40 px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">Source</span>
                      {severities.map((severity) => (
                        <span
                          className="text-center text-xs font-medium capitalize text-muted-foreground"
                          key={severity}
                        >
                          {severity}
                        </span>
                      ))}
                    </div>
                    {sources.map((source) => (
                      <div
                        className="grid grid-cols-[1.4fr_repeat(4,1fr)] items-center gap-2 border-b px-3 py-2 last:border-b-0"
                        key={source.id}
                      >
                        <span className="text-sm font-medium">{source.label}</span>
                        {severities.map((severity) => {
                          const rule = rules.find((r) => r.source === source.id && r.severity === severity);
                          return (
                            <div className="flex justify-center" key={severity}>
                              <Switch
                                checked={rule?.enabled ?? false}
                                onCheckedChange={(enabled) => {
                                  toggleRule(source.id, severity, enabled);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={isSaving} onClick={() => void handleSaveRules()} size="sm">
                      {isSaving ? <Spinner className="mr-1.5 size-3.5" /> : null}
                      Save rules
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
                <div className="flex gap-3 rounded-lg border border-blue-500/10 bg-blue-500/5 p-4">
                  <div className="mt-0.5 size-5 shrink-0 text-blue-500">
                    <SlackIcon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Slack Workspace Integration
                    </h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      We use a Slack app to post alerts to a channel you choose. You pick which severities and sources
                      trigger notifications.
                    </p>
                  </div>
                </div>

                <div
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                  onClick={() => {
                    void handleConnect();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      void handleConnect();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background transition-colors group-hover:border-primary/50">
                    {isConnecting ? (
                      <Spinner className="size-6 text-primary" />
                    ) : (
                      <SlackIcon className="size-6 transition-colors group-hover:text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {isConnecting ? "Opening Slack authorization..." : "Connect Slack Workspace"}
                    </div>
                    <div className="text-sm text-muted-foreground">Redirects to Slack for authorization</div>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-10 mt-auto flex shrink-0 justify-end gap-3 border-t bg-white p-4 dark:border-border dark:bg-card">
            <Button
              onClick={() => {
                onOpenChange(false);
              }}
              variant="ghost"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

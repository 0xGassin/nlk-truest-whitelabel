"use client";

import type { GitHubIntegration } from "@/services/api/github";

import { ArrowRight, Unlink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { dialogPrimaryButtonClassName } from "@/components/ui/dialog-panel";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";
import { useAuth } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { githubApi } from "@/services/api/github";

import { IntegrationDialogShell, integrationHelperTextClassName } from "./integration-dialog-shell";
import {
  IntegrationStepBody,
  IntegrationStepIntro,
  IntegrationStepLinkAction,
  IntegrationStepNote,
} from "./integration-step-content";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function getGitHubAvatarUrl(username: string) {
  return `https://github.com/${username}.png`;
}

function GitHubUserAvatar({ username }: { username: string }) {
  return (
    <Avatar className="size-9 shrink-0">
      <AvatarImage alt={username} src={getGitHubAvatarUrl(username)} />
      <AvatarFallback className="bg-[#fafafa] text-xs font-medium text-foreground dark:bg-muted">
        {username.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

interface GitHubIntegrationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function GitHubIntegrationDialog({ onOpenChange, open }: GitHubIntegrationDialogProps) {
  const { user } = useAuth();
  const currentOrganization = user?.organization;

  const [isLoading, setIsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<GitHubIntegration[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<null | string>(null);

  useEffect(() => {
    if (!open || !currentOrganization) return;
    void (async () => {
      setIsChecking(true);
      try {
        const data = await githubApi.getIntegrations(currentOrganization.id);
        setIntegrations(Array.isArray(data) ? data : []);
      } catch {
        setIntegrations([]);
      } finally {
        setIsChecking(false);
      }
    })();
  }, [open, currentOrganization]);

  const handleConnect = async () => {
    if (!currentOrganization) {
      toast.error("Organization not found", {
        description: "Please ensure you are within an organization context.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await githubApi.login(currentOrganization.id);
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to initiate GitHub login", { error: apiError.message });
      toast.error(apiError.message, {
        description: "We could not redirect you to GitHub at this time.",
      });
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (integration: GitHubIntegration) => {
    if (!currentOrganization) return;

    const confirmed = confirm(
      `Disconnect ${integration.github_username} from Truest? This will unlink all repositories and remove scan data for this GitHub connection.`,
    );
    if (!confirmed) return;

    setDisconnectingId(integration.id);
    try {
      await githubApi.disconnectIntegration(currentOrganization.id, integration.id);
      setIntegrations((prev) => prev.filter((item) => item.id !== integration.id));
      toast.success("GitHub disconnected", {
        description: `${integration.github_username} has been removed from your organization.`,
      });
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to disconnect GitHub integration", { error: apiError.message });
      toast.error("Failed to disconnect GitHub", {
        description: apiError.message,
      });
    } finally {
      setDisconnectingId(null);
    }
  };

  const footerHint =
    integrations.length > 0
      ? `${integrations.length} ${integrations.length === 1 ? "account" : "accounts"} connected`
      : "Authorize via GitHub to link repositories";

  return (
    <IntegrationDialogShell
      footer={
        integrations.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link
                href="/assets/repositories"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Manage Repositories
              </Link>
            </Button>
            <Button
              className={dialogPrimaryButtonClassName}
              disabled={isLoading}
              onClick={() => {
                void handleConnect();
              }}
              type="button"
            >
              {isLoading ? <Spinner className="mr-2 size-4" /> : null}
              Link GitHub Account
            </Button>
          </div>
        ) : undefined
      }
      footerHint={footerHint}
      integration={{
        description: "Connect your GitHub repositories to track changes and correlate them with cloud resources.",
        icon: (
          <div className="flex size-10 items-center justify-center rounded-full bg-black text-white">
            <GithubIcon className="size-6" />
          </div>
        ),
        name: "GitHub",
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Install Integration"
    >
      <IntegrationStepBody>
        {isChecking ? (
          <div className="flex justify-center py-12">
            <Spinner className="size-8 text-[#666666] dark:text-muted-foreground" />
          </div>
        ) : integrations.length === 0 ? (
          <>
            <IntegrationStepNote>
              We use a GitHub App to securely access your repositories. You can grant access to all repositories or
              specific ones.
            </IntegrationStepNote>
            <IntegrationStepLinkAction
              description="Redirects to GitHub for authorization"
              icon={<GithubIcon className="size-4" />}
              isLoading={isLoading}
              onClick={() => {
                void handleConnect();
              }}
              title="Connect GitHub Account"
            />
          </>
        ) : (
          <>
            <IntegrationStepIntro>
              {integrations.length} {integrations.length === 1 ? "account is" : "accounts are"} connected to your
              organization.
            </IntegrationStepIntro>
            <div className="overflow-hidden rounded-lg border border-[#eaeaea] dark:border-border">
              {integrations.map((integration, index) => (
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5",
                    index > 0 && "border-t border-[#eaeaea] dark:border-border",
                  )}
                  key={integration.id}
                >
                  <GitHubUserAvatar username={integration.github_username} />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium text-foreground">
                      <a
                        className="hover:underline"
                        href={`https://github.com/${integration.github_username}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {integration.github_username}
                      </a>
                    </h4>
                    <p className={cn(integrationHelperTextClassName, "flex items-center gap-1.5 text-xs")}>
                      <span className="size-1.5 rounded-full bg-green-500" />
                      Connected
                    </p>
                  </div>
                  <Button
                    className="shrink-0 text-[#666666] hover:text-destructive dark:text-muted-foreground"
                    disabled={disconnectingId === integration.id}
                    onClick={() => {
                      void handleDisconnect(integration);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {disconnectingId === integration.id ? (
                      <Spinner className="size-4" />
                    ) : (
                      <>
                        <Unlink className="mr-1.5 size-4" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </IntegrationStepBody>
    </IntegrationDialogShell>
  );
}

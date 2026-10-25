"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";
import { linearApi } from "@/features/integrations";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { IntegrationDialogShell, integrationHelperTextClassName } from "./integration-dialog-shell";
import {
  IntegrationStepBody,
  IntegrationStepIntro,
  IntegrationStepLinkAction,
  IntegrationStepLinkActions,
  IntegrationStepNote,
} from "./integration-step-content";

interface LinearIntegrationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface Team {
  id: string;
  key: string;
  name: string;
}

function LinearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.03509 12.9431C3.24245 14.9227 4.10472 16.8468 5.62188 18.364C7.13904 19.8811 9.0631 20.7434 11.0428 20.9508L3.03509 12.9431Z"
        fill="currentColor"
      />
      <path
        d="M3 11.4938L12.4921 20.9858C13.2976 20.9407 14.0981 20.7879 14.8704 20.5273L3.4585 9.11548C3.19793 9.88771 3.0451 10.6883 3 11.4938Z"
        fill="currentColor"
      />
      <path
        d="M3.86722 8.10999L15.8758 20.1186C16.4988 19.8201 17.0946 19.4458 17.6493 18.9956L4.99021 6.33659C4.54006 6.89125 4.16573 7.487 3.86722 8.10999Z"
        fill="currentColor"
      />
      <path
        d="M5.66301 5.59517C9.18091 2.12137 14.8488 2.135 18.3498 5.63604C21.8508 9.13708 21.8645 14.8049 18.3907 18.3228L5.66301 5.59517Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LinearIntegrationDialog({ onOpenChange, open }: LinearIntegrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<string>();
  const [isConnected, setIsConnected] = useState(false);

  const checkConnection = async () => {
    try {
      const isConnectedResult = await linearApi.verifyConnection();
      setIsConnected(isConnectedResult);
    } catch (error) {
      console.log(error);
    }
  };

  const getTeams = async () => {
    try {
      const teamsResult = await linearApi.getTeams();
      setTeams(teamsResult);
    } catch (error) {
      console.log(error);
    }
  };

  const getTeamId = async () => {
    try {
      const currentTeamId = await linearApi.getCurrentTeam();
      setCurrentTeam(currentTeamId);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    void checkConnection();
    void getTeams();
    void getTeamId();
  }, [isConnected]);

  const updateTeam = async (id: string) => {
    try {
      await linearApi.setTeamId(id);
      setCurrentTeam(id);
    } catch (error) {
      console.log(error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const url = await linearApi.connectionLink();
      globalThis.location.href = url;
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("Failed to generate linear connection link", { error: apiError.message });
      toast.error(apiError.message, {
        description: "We could not redirect you to Linear at this time.",
      });
      setIsLoading(false);
    }
  };

  const footerHint = isConnected
    ? currentTeam
      ? "Workspace team selected for issue tracking"
      : "Select a team to receive vulnerabilities"
    : "Authorize via Linear to connect your workspace";

  return (
    <IntegrationDialogShell
      footerHint={footerHint}
      integration={{
        description: "Connect your Linear workspace to manage and track findings across your cloud environments.",
        icon: (
          <div className="flex size-10 items-center justify-center rounded-full bg-black text-white">
            <LinearIcon className="size-5" />
          </div>
        ),
        name: "Linear",
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Install Integration"
    >
      <IntegrationStepBody>
        {isConnected ? (
          <>
            <IntegrationStepIntro>
              Select the Linear team that should receive vulnerabilities from Truest.
            </IntegrationStepIntro>
            <div className="overflow-hidden rounded-lg border border-[#eaeaea] dark:border-border">
              {teams.map((team, index) => (
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5",
                    index > 0 && "border-t border-[#eaeaea] dark:border-border",
                    currentTeam === team.id && "bg-[#fafafa] dark:bg-muted/40",
                  )}
                  key={team.id}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#eaeaea] bg-white text-xs font-medium text-foreground dark:border-border dark:bg-card">
                    {team.key}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium text-foreground">{team.name}</h4>
                    <p className={cn(integrationHelperTextClassName, "flex items-center gap-1.5 text-xs")}>
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          currentTeam === team.id ? "bg-green-500" : "bg-[#cccccc] dark:bg-muted-foreground/50",
                        )}
                      />
                      {currentTeam === team.id ? "Connected" : "Not Connected"}
                    </p>
                  </div>
                  {currentTeam === team.id ? (
                    <Check className="size-4 shrink-0 text-green-500" />
                  ) : (
                    <Button
                      onClick={() => {
                        void updateTeam(team.id);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <IntegrationStepLinkActions>
              <IntegrationStepLinkAction
                description="Re-authorize your Linear workspace"
                icon={<LinearIcon className="size-4" />}
                isLoading={isLoading}
                onClick={() => {
                  void handleConnect();
                }}
                title="Reconnect Account"
              />
            </IntegrationStepLinkActions>
          </>
        ) : (
          <>
            <IntegrationStepNote>
              We use a Linear App to securely access your workspaces. You choose which workspace vulnerabilities get
              added to.
            </IntegrationStepNote>
            <IntegrationStepLinkAction
              description={
                isLoading ? "Check to see if Linear connected successfully" : "Redirects to Linear for authorization"
              }
              icon={<LinearIcon className="size-4" />}
              isLoading={isLoading}
              onClick={() => {
                if (isLoading) {
                  void checkConnection();
                } else {
                  void handleConnect();
                }
              }}
              title={isLoading ? "All Done?" : "Connect Linear Account"}
            />
          </>
        )}
      </IntegrationStepBody>
    </IntegrationDialogShell>
  );
}

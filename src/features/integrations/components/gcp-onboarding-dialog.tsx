"use client";

import { ChevronRight, Upload } from "lucide-react";
import * as React from "react";

import { AlertMessage } from "@/components/ui/alert-message";
import { Button } from "@/components/ui/button";
import { CommandCodeBlock } from "@/components/ui/command-code-block";
import { dialogPrimaryButtonClassName, fieldInputClassName, fieldLabelClassName, fieldSpacing } from "@/components/ui/dialog-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { GoogleCloud } from "@/components/ui/svgs/googleCloud";
import { toast } from "@/components/ui/toast/toast";
import { gcpService } from "@/features/integrations";
import { useAuth } from "@/lib/auth";
import { normalizeConnectionName } from "@/lib/connection-name";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import {
  IntegrationDialogShell,
} from "./integration-dialog-shell";
import {
  IntegrationStepActionRow,
  IntegrationStepBody,
  IntegrationStepExternalActionRow,
  IntegrationStepFieldHint,
  IntegrationStepFields,
  IntegrationStepInstructions,
  IntegrationStepIntro,
  IntegrationStepKeyValue,
  IntegrationStepNote,
  IntegrationStepUploadZone,
} from "./integration-step-content";
import { IntegrationStepper } from "./integration-stepper";

interface GCPOnboardingDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface GCPOnboardingState {
  completedSteps: Set<number>;
  connectionName: string;
  connectionPurpose: string;
  currentStep: number;
  externalStepsOpened: Set<number>;
  projectId: string;
  projectNumber: string;
  serviceAccountKey: string;
}

interface ApiErrorWithResponse {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
}

const GCP_ENABLE_APIS_COMMAND = `gcloud services enable compute.googleapis.com storage-component.googleapis.com iam.googleapis.com container.googleapis.com logging.googleapis.com monitoring.googleapis.com cloudresourcemanager.googleapis.com cloudkms.googleapis.com bigquery.googleapis.com dns.googleapis.com sqladmin.googleapis.com appengine.googleapis.com`;

const GCP_CLOUD_SHELL_URL = "https://shell.cloud.google.com/";
const GCP_SERVICE_ACCOUNTS_URL = "https://console.cloud.google.com/iam-admin/serviceaccounts";

function handleCopyCommand(command: string) {
  void navigator.clipboard.writeText(command);
  toast.success("Command copied to clipboard");
}

export function GCPOnboardingDialog({ onOpenChange, open }: GCPOnboardingDialogProps) {
  const { user } = useAuth();
  const [state, setState] = React.useState<GCPOnboardingState>(() => ({
    completedSteps: new Set(),
    connectionName: "",
    connectionPurpose: "",
    currentStep: 1,
    externalStepsOpened: new Set(),
    projectId: "",
    projectNumber: "",
    serviceAccountKey: "",
  }));
  const [isLoading, setIsLoading] = React.useState(false);
  const [keyFileError, setKeyFileError] = React.useState<null | string>(null);

  const handleKeyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKeyFileError(null);

    try {
      const content = await file.text();

      if (!gcpService.validateServiceAccountKeyFormat(content)) {
        setKeyFileError(
          "Invalid service account key format. Please ensure it is a valid GCP service account JSON file.",
        );
        return;
      }

      const projectId = gcpService.extractProjectIdFromKey(content);
      const projectNumber = gcpService.extractProjectNumberFromKey(content);

      setState((prev) => ({
        ...prev,
        projectId: projectId ?? prev.projectId,
        projectNumber: projectNumber ?? prev.projectNumber,
        serviceAccountKey: content,
      }));

      toast.success("Service account key loaded successfully", {
        description: "Project details have been extracted automatically.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read file";
      setKeyFileError(message);
      logger.error("GCP key file upload error", { error: message });
    }
  };

  const markExternalOpened = (step: number) => {
    setState((prev) => ({
      ...prev,
      externalStepsOpened: new Set([...prev.externalStepsOpened, step]),
    }));
  };

  const openGcpConsole = (url: string, step: number, toastDescription: string) => {
    window.open(url, "_blank");
    markExternalOpened(step);
    toast.success("GCP Console opened", {
      description: toastDescription,
    });
  };

  const markStepComplete = (step: number) => {
    setState((prev) => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, step]),
    }));
  };

  const renderStepBack = () =>
    state.currentStep > 1
      ? handlePreviousStep
      : () => {
          onOpenChange(false);
        };

  const handleNextStep = () => {
    if (state.currentStep < 5) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    }
  };

  const handlePreviousStep = () => {
    if (state.currentStep > 1) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!state.connectionName) throw new Error("Connection name is required");
      if (!state.connectionPurpose) throw new Error("Connection purpose is required");
      if (!state.serviceAccountKey) throw new Error("Service account key is required");
      if (!state.projectId) throw new Error("Project ID is required");

      const orgId = user?.organization?.id ?? user?.organization_id;
      if (!orgId) throw new Error("Organization ID not found");

      logger.debug("GCP validation submit", {
        connectionName: state.connectionName,
        orgId,
        projectId: state.projectId,
        userOrganization: user?.organization,
        userOrgId: user?.organization_id ?? "",
      });

      const requestPayload = {
        connection_name: state.connectionName,
        connection_purpose: state.connectionPurpose,
        project_id: state.projectId,
        project_number: state.projectNumber,
        region: "us-central1",
        service_account_key: state.serviceAccountKey,
      };

      const response = await gcpService.validateServiceAccount(orgId, requestPayload);

      if (response.project_id) {
        sessionStorage.setItem(`connector_project_${response.connection_id}`, response.project_id);
      }

      toast.success("GCP project connected successfully!", {
        description: "Your GCP project is now linked and ready for scanning.",
      });

      setTimeout(() => {
        onOpenChange(false);
        setState({
          completedSteps: new Set(),
          connectionName: "",
          connectionPurpose: "",
          currentStep: 1,
          externalStepsOpened: new Set(),
          projectId: "",
          projectNumber: "",
          serviceAccountKey: "",
        });
        setKeyFileError(null);
        globalThis.dispatchEvent(
          new CustomEvent("connection-created", {
            detail: { connectionId: response.connection_id },
          }),
        );
      }, 1000);
    } catch (error: unknown) {
      const response = (error as ApiErrorWithResponse).response;
      if (response?.status === 403) {
        toast("Connector Limit Reached", {
          description:
            response.data?.message ??
            "You've reached the cloud connector limit for your plan. Please upgrade to add more connectors.",
        });
        window.open("/settings", "_blank");
      } else {
        const apiError = parseApiError(error);
        logger.error("GCP connection creation error", { error: apiError.message });
        toast.error(apiError.message, {
          description: "There was a verification error. Please ensure the service account key is correct.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stepHints: Record<number, string> = {
    1: "Open Cloud Shell and enable the required GCP APIs",
    2: "Create a read-only service account in IAM",
    3: "Create and download a JSON key for the service account",
    4: "Upload your service account key file",
    5: "Name your connection and choose a purpose",
  };

  return (
    <IntegrationDialogShell
      footerHint={stepHints[state.currentStep]}
      integration={{
        description: "Connect your Google Cloud project to scan and monitor cloud infrastructure.",
        icon: <GoogleCloud className="size-8" />,
        name: "Google Cloud Platform",
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Install Integration"
    >
      <IntegrationStepper
        completedSteps={[...state.completedSteps]}
        currentStep={state.currentStep}
        steps={[
          {
            action: (
              <IntegrationStepExternalActionRow
                isOpened={state.externalStepsOpened.has(1)}
                onBack={renderStepBack()}
                onContinue={() => {
                  markStepComplete(1);
                  handleNextStep();
                }}
                onOpen={() => {
                  openGcpConsole(
                    GCP_CLOUD_SHELL_URL,
                    1,
                    "Run the enable APIs command in Cloud Shell, then return here to continue.",
                  );
                }}
                openAgainLabel="Open Cloud Shell again"
                openLabel="Open Cloud Shell"
                showBack
              />
            ),
            content: (
              <IntegrationStepBody>
                <IntegrationStepIntro>
                  Open Cloud Shell in your GCP project, then enable the APIs required for read-only resource scanning.
                  Cloud Shell opens in a new browser tab.
                </IntegrationStepIntro>
                <IntegrationStepInstructions
                  steps={[
                    {
                      description: "Click the Activate Cloud Shell icon in the top right of the GCP console.",
                      title: "Activate Cloud Shell",
                    },
                    {
                      content: <CommandCodeBlock command={GCP_ENABLE_APIS_COMMAND} onCopy={handleCopyCommand} />,
                      description: "Run this command in Cloud Shell to enable the required APIs.",
                      title: "Enable required APIs",
                    },
                  ]}
                />
              </IntegrationStepBody>
            ),
            label: "Enable APIs",
          },
          {
            action: (
              <IntegrationStepExternalActionRow
                isOpened={state.externalStepsOpened.has(2)}
                onBack={renderStepBack()}
                onContinue={() => {
                  markStepComplete(2);
                  handleNextStep();
                }}
                onOpen={() => {
                  openGcpConsole(
                    GCP_SERVICE_ACCOUNTS_URL,
                    2,
                    "Create a service account with read-only permissions, then return here to continue.",
                  );
                }}
                openAgainLabel="Open Service Accounts again"
                openLabel="Open Service Accounts"
                showBack
              />
            ),
            content: (
              <IntegrationStepBody>
                <IntegrationStepIntro>
                  Create a read-only service account in the GCP Console so NuLink can scan your project. The console
                  opens in a new browser tab.
                </IntegrationStepIntro>
                <IntegrationStepInstructions
                  steps={[
                    {
                      description: "Create a service account with read-only permissions for security scanning.",
                      title: "Create a service account",
                    },
                  ]}
                />
                <IntegrationStepNote>
                  Name the account with &quot;nulink&quot; in it, then assign Security Reviewer and Viewer roles.
                </IntegrationStepNote>
              </IntegrationStepBody>
            ),
            label: "Configure Access",
          },
          {
            action: (
              <IntegrationStepExternalActionRow
                isOpened={state.externalStepsOpened.has(3)}
                onBack={renderStepBack()}
                onContinue={() => {
                  markStepComplete(3);
                  handleNextStep();
                }}
                onOpen={() => {
                  openGcpConsole(
                    GCP_SERVICE_ACCOUNTS_URL,
                    3,
                    "Create and download a JSON key, then return here to continue.",
                  );
                }}
                openAgainLabel="Open Service Accounts again"
                openLabel="Open Service Accounts"
                showBack
              />
            ),
            content: (
              <IntegrationStepBody>
                <IntegrationStepIntro>
                  Open the service account in GCP Console and create a JSON key. The console opens in a new browser tab.
                </IntegrationStepIntro>
                <IntegrationStepInstructions
                  steps={[
                    { title: "Open the service account you created" },
                    { title: "Go to the Keys tab" },
                    { title: "Click Add Key, then Create new key" },
                    { title: "Select JSON as the key type" },
                    { title: "Save the downloaded JSON file" },
                  ]}
                />
              </IntegrationStepBody>
            ),
            label: "Create Key",
          },
          {
            action: (
              <IntegrationStepActionRow
                onBack={renderStepBack()}
                primary={
                  <Button
                    className={state.serviceAccountKey ? dialogPrimaryButtonClassName : undefined}
                    disabled={!state.serviceAccountKey}
                    onClick={() => {
                      markStepComplete(4);
                      handleNextStep();
                    }}
                    type="button"
                    variant={state.serviceAccountKey ? "default" : "outline"}
                  >
                    Continue
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                }
                showBack
              />
            ),
            content: (
              <IntegrationStepBody>
                <IntegrationStepIntro>Upload the JSON key file you downloaded from GCP.</IntegrationStepIntro>
                <IntegrationStepUploadZone
                  description="JSON service account key file"
                  icon={<Upload className="size-6" />}
                  id="service-account-file"
                  onChange={(e) => {
                    void handleKeyFileUpload(e);
                  }}
                  title="Click to upload or drag and drop"
                />
                {keyFileError ? <AlertMessage message={keyFileError} variant="error" /> : null}
                {state.serviceAccountKey ? (
                  <>
                    <AlertMessage message="Service account key loaded successfully" variant="success" />
                    <IntegrationStepKeyValue
                      items={[
                        { label: "Project ID", value: state.projectId },
                        ...(state.projectNumber ? [{ label: "Project Number", value: state.projectNumber }] : []),
                      ]}
                    />
                  </>
                ) : null}
              </IntegrationStepBody>
            ),
            label: "Upload Key",
          },
          {
            action: (
              <IntegrationStepActionRow
                onBack={handlePreviousStep}
                primary={
                  <Button className={dialogPrimaryButtonClassName} disabled={isLoading} form="gcp-connect-form" type="submit">
                    {isLoading ? <Spinner className="mr-2 size-4" /> : null}
                    Complete Connection
                  </Button>
                }
              />
            ),
            content: (
              <form
                id="gcp-connect-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit(e);
                }}
              >
                <IntegrationStepBody>
                  <IntegrationStepIntro>Give your GCP connection a name and purpose.</IntegrationStepIntro>
                  <IntegrationStepFields>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                      <div className={fieldSpacing}>
                        <Label className={fieldLabelClassName} htmlFor="conn-name">
                          Connection Name *
                        </Label>
                        <Input
                          autoCapitalize="none"
                          autoComplete="off"
                          className={fieldInputClassName}
                          id="conn-name"
                          onChange={(e) => {
                            setState((prev) => ({
                              ...prev,
                              connectionName: normalizeConnectionName(e.target.value),
                            }));
                          }}
                          pattern="[a-z0-9-]+"
                          placeholder="production-env"
                          required
                          spellCheck={false}
                          value={state.connectionName}
                        />
                        <IntegrationStepFieldHint>A friendly name to identify this GCP connection.</IntegrationStepFieldHint>
                      </div>
                      <div className={fieldSpacing}>
                        <Label className={fieldLabelClassName} htmlFor="conn-purpose">
                          Connection Purpose *
                        </Label>
                        <Select
                          onValueChange={(value) => {
                            setState((prev) => ({
                              ...prev,
                              connectionPurpose: value,
                            }));
                          }}
                          value={state.connectionPurpose || undefined}
                        >
                          <SelectTrigger id="conn-purpose">
                            <SelectValue placeholder="Select a purpose..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="development">Development</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="testing">Testing</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <IntegrationStepFieldHint>Helps organize and track your cloud resources.</IntegrationStepFieldHint>
                      </div>
                    </div>
                  </IntegrationStepFields>
                  <AlertMessage
                    message="Your service account key will be securely encrypted and stored. We only use it to scan your GCP resources."
                    variant="info"
                  />
                </IntegrationStepBody>
              </form>
            ),
            label: "Finalize",
          },
        ]}
      />
    </IntegrationDialogShell>
  );
}

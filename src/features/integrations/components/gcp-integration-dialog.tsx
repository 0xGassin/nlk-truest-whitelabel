"use client";

import { Upload } from "lucide-react";
import * as React from "react";

import { AlertMessage } from "@/components/ui/alert-message";
import { Button } from "@/components/ui/button";
import {
  dialogPrimaryButtonClassName,
  fieldInputClassName,
  fieldLabelClassName,
  fieldSpacing,
} from "@/components/ui/dialog-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { GoogleCloud } from "@/components/ui/svgs/googleCloud";
import { toast } from "@/components/ui/toast/toast";
import { gcpService } from "@/features/integrations";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { normalizeConnectionName } from "@/lib/connection-name";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { IntegrationDialogShell } from "./integration-dialog-shell";
import {
  IntegrationStepActionRow,
  IntegrationStepBody,
  IntegrationStepExternalActionRow,
  IntegrationStepFieldHint,
  IntegrationStepFields,
  IntegrationStepInstructions,
  IntegrationStepIntro,
  IntegrationStepUploadZone,
} from "./integration-step-content";
import { IntegrationStepper } from "./integration-stepper";

interface GCPIntegrationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface GCPCredentials {
  connectionName: string;
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

const GCP_SERVICE_ACCOUNTS_URL = "https://console.cloud.google.com/iam-admin/serviceaccounts";

export function GCPIntegrationDialog({ onOpenChange, open }: GCPIntegrationDialogProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [step1Completed, setStep1Completed] = React.useState(false);
  const [consoleOpened, setConsoleOpened] = React.useState(false);
  const [keyFileError, setKeyFileError] = React.useState<null | string>(null);

  const [gcpCreds, setGcpCreds] = React.useState<GCPCredentials>({
    connectionName: "",
    projectId: "",
    projectNumber: "",
    serviceAccountKey: "",
  });

  const handleKeyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKeyFileError(null);

    try {
      const content = await file.text();

      if (!gcpService.validateServiceAccountKeyFormat(content)) {
        setKeyFileError(
          "Invalid service account key format. Please ensure it's a valid GCP service account JSON file.",
        );
        return;
      }

      setGcpCreds((prev) => ({
        ...prev,
        serviceAccountKey: content,
      }));

      const projectId = gcpService.extractProjectIdFromKey(content);
      const projectNumber = gcpService.extractProjectNumberFromKey(content);

      if (projectId) {
        setGcpCreds((prev) => ({
          ...prev,
          projectId: projectId,
        }));
      }

      if (projectNumber) {
        setGcpCreds((prev) => ({
          ...prev,
          projectNumber: projectNumber,
        }));
      }

      setStep1Completed(true);
      toast.success("Service Account Key Loaded", {
        description: "Project details have been automatically extracted.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read file";
      setKeyFileError(message);
      logger.error("GCP key file upload error", { error: message });
    }
  };

  const handleCredentialsChange =
    (field: keyof GCPCredentials) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === "connectionName" ? normalizeConnectionName(e.target.value) : e.target.value;
      setGcpCreds((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!gcpCreds.connectionName) throw new Error("Connection name is required");
      if (!gcpCreds.serviceAccountKey) throw new Error("Service account key is required");
      if (!gcpCreds.projectId) throw new Error("Project ID is required");

      const orgId = user?.organization?.id ?? user?.organization_id;
      if (!orgId) throw new Error("Organization ID not found");

      const requestPayload = {
        connection_name: gcpCreds.connectionName,
        project_id: gcpCreds.projectId,
        project_number: gcpCreds.projectNumber,
        region: "us-central1",
        service_account_key: gcpCreds.serviceAccountKey,
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
        setGcpCreds({
          connectionName: "",
          projectId: "",
          projectNumber: "",
          serviceAccountKey: "",
        });
        setCurrentStep(1);
        setStep1Completed(false);
        setConsoleOpened(false);
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

  const footerHint =
    currentStep === 1
      ? "Open Service Accounts to create a key, then upload your JSON file"
      : "Review connection details and connect your project";

  return (
    <IntegrationDialogShell
      footerHint={footerHint}
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
        completedSteps={step1Completed ? [1] : []}
        currentStep={currentStep}
        steps={[
          {
            action: (
              <IntegrationStepExternalActionRow
                continueDisabled={!step1Completed}
                continueReady={step1Completed}
                isOpened={consoleOpened}
                onBack={() => {
                  onOpenChange(false);
                }}
                onContinue={() => {
                  setCurrentStep(2);
                }}
                onOpen={() => {
                  window.open(GCP_SERVICE_ACCOUNTS_URL, "_blank");
                  setConsoleOpened(true);
                  toast.success("GCP Console opened", {
                    description: "Create a JSON key for your service account, then upload it here.",
                  });
                }}
                openAgainLabel="Open Service Accounts again"
                openLabel="Open Service Accounts"
                showBack
              />
            ),
            content: (
              <IntegrationStepBody>
                <IntegrationStepIntro>
                  Open Service Accounts in GCP Console to create a JSON key, then upload it here. The console opens in a
                  new browser tab.
                </IntegrationStepIntro>
                <IntegrationStepUploadZone
                  description="JSON service account key file"
                  icon={<Upload className="size-6" />}
                  id="gcp-integration-service-account-file"
                  onChange={(e) => {
                    void handleKeyFileUpload(e);
                  }}
                  title="Click to upload or drag and drop"
                />
                {keyFileError ? <AlertMessage message={keyFileError} variant="error" /> : null}
                {gcpCreds.serviceAccountKey ? (
                  <AlertMessage message="Service account key loaded successfully" variant="success" />
                ) : null}
                <IntegrationStepInstructions
                  steps={[
                    { title: "Open Google Cloud Console" },
                    { title: "Go to IAM & Admin → Service Accounts" },
                    { title: "Create or select a service account" },
                    { title: "Create a JSON key under the Keys tab" },
                    { title: "Upload the downloaded file here" },
                  ]}
                />
              </IntegrationStepBody>
            ),
            label: "Upload Service Account Key",
          },
          {
            action: (
              <IntegrationStepActionRow
                onBack={() => {
                  setCurrentStep(1);
                }}
                primary={
                  <Button
                    className={dialogPrimaryButtonClassName}
                    disabled={isLoading}
                    form="gcp-connect-form"
                    type="submit"
                  >
                    {isLoading ? <Spinner className="mr-2 size-4" /> : null}
                    Connect Project
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
                  <IntegrationStepIntro>
                    Review the extracted project details and name this connection.
                  </IntegrationStepIntro>
                  <IntegrationStepFields>
                    <div className={fieldSpacing}>
                      <Label className={fieldLabelClassName} htmlFor="conn-name">
                        Connection Name
                      </Label>
                      <Input
                        autoCapitalize="none"
                        autoComplete="off"
                        className={fieldInputClassName}
                        id="conn-name"
                        onChange={handleCredentialsChange("connectionName")}
                        pattern="[a-z0-9-]+"
                        placeholder="production-env"
                        required
                        spellCheck={false}
                        value={gcpCreds.connectionName}
                      />
                      <IntegrationStepFieldHint>A friendly name to identify this connection.</IntegrationStepFieldHint>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={fieldSpacing}>
                        <Label className={fieldLabelClassName} htmlFor="project-id">
                          Project ID
                        </Label>
                        <Input
                          className={cn(fieldInputClassName, gcpCreds.projectId ? "bg-[#fafafa] dark:bg-muted/40" : "")}
                          id="project-id"
                          onChange={handleCredentialsChange("projectId")}
                          placeholder="my-gcp-project"
                          readOnly={gcpCreds.projectId !== ""}
                          required
                          value={gcpCreds.projectId}
                        />
                        <IntegrationStepFieldHint>Auto-extracted from your key file.</IntegrationStepFieldHint>
                      </div>
                      {gcpCreds.projectNumber ? (
                        <div className={fieldSpacing}>
                          <Label className={fieldLabelClassName} htmlFor="project-number">
                            Project Number
                          </Label>
                          <Input
                            className={cn(fieldInputClassName, "bg-[#fafafa] dark:bg-muted/40")}
                            id="project-number"
                            placeholder="639514832012"
                            readOnly
                            value={gcpCreds.projectNumber}
                          />
                          <IntegrationStepFieldHint>Auto-extracted from your key file.</IntegrationStepFieldHint>
                        </div>
                      ) : null}
                    </div>
                  </IntegrationStepFields>
                  <AlertMessage
                    message="Your service account key will be securely encrypted and stored. We only use it to scan your GCP resources."
                    variant="info"
                  />
                </IntegrationStepBody>
              </form>
            ),
            label: "Review & Connect",
          },
        ]}
      />
    </IntegrationDialogShell>
  );
}

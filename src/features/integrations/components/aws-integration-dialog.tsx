"use client";

import { ChevronRight, Terminal } from "lucide-react";
import * as React from "react";

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
import { AwsDark } from "@/components/ui/svgs/awsDark";
import { AwsLight } from "@/components/ui/svgs/awsLight";
import { toast } from "@/components/ui/toast/toast";
import { cn } from "@/lib/utils";
import { awsService } from "@/features/integrations";
import { useAuth } from "@/lib/auth";
import { normalizeConnectionName } from "@/lib/connection-name";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { IntegrationDialogShell } from "./integration-dialog-shell";
import {
  IntegrationStepActionRow,
  IntegrationStepBody,
  IntegrationStepFieldHint,
  IntegrationStepFields,
  IntegrationStepIntro,
} from "./integration-step-content";
import { IntegrationStepper } from "./integration-stepper";
import { useTheme } from "../hooks/use-theme";

interface AWSIntegrationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

interface CloudFormationCredentials {
  connectionName: string;
  roleArn: string;
}

interface ApiErrorWithResponse {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
}

export function AWSIntegrationDialog({ onOpenChange, open }: AWSIntegrationDialogProps) {
  const isDark = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [step1Completed, setStep1Completed] = React.useState(false);

  const [cloudFormationCreds, setCloudFormationCreds] = React.useState<CloudFormationCredentials>({
    connectionName: "",
    roleArn: "",
  });

  const handleCloudFormationChange =
    (field: keyof CloudFormationCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "connectionName" ? normalizeConnectionName(e.target.value) : e.target.value;
      setCloudFormationCreds((prev) => ({ ...prev, [field]: value }));
    };

  const handleLaunchCloudFormation = async () => {
    const orgId = user?.organization?.id ?? user?.organization_id;
    if (!orgId) {
      toast.error("Organization ID not found", {
        description: "Please ensure you're part of an organization to connect an AWS account.",
      });
      return;
    }

    setIsLaunching(true);

    try {
      const response = await awsService.generateCloudFormationTemplate(orgId);
      window.open(response.cloudformation_url, "_blank");
      setStep1Completed(true);
      toast.success("Stack Launching", {
        description: "Complete the stack creation in the AWS console tab.",
      });
    } catch (error) {
      const apiError = parseApiError(error);
      logger.error("CloudFormation launch error", { error: apiError.message });
      toast.error(apiError.message, {
        description: "We encountered an error while generating the template. Please try again.",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!cloudFormationCreds.connectionName) throw new Error("Connector name is required");
      if (!cloudFormationCreds.roleArn) throw new Error("Role ARN is required");

      const orgId = user?.organization?.id ?? user?.organization_id;
      if (!orgId) throw new Error("Organization ID not found");

      const requestPayload = {
        connection_name: cloudFormationCreds.connectionName,
        credential_type: "cloudformation" as const,
        region: "us-east-1",
        role_arn: cloudFormationCreds.roleArn,
      };

      const response = await awsService.validateRoleARN(orgId, requestPayload);

      if (response.account_id) {
        sessionStorage.setItem(`connector_account_${response.connection_id}`, response.account_id);
      }

      toast.success("AWS integration connected successfully!", {
        description: "Your AWS account is now linked and ready for scanning.",
      });

      setTimeout(() => {
        onOpenChange(false);
        setCloudFormationCreds({ connectionName: "", roleArn: "" });
        setCurrentStep(1);
        setStep1Completed(false);
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
        logger.error("AWS connection creation error", { error: apiError.message });
        toast.error(apiError.message, {
          description: "There was a verification error. Please ensure the Role ARN is correct and the stack is ready.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const footerHint =
    currentStep === 1
      ? "Launch the CloudFormation stack in AWS Console to continue"
      : "Paste the Role ARN from the CloudFormation Outputs tab";

  return (
    <IntegrationDialogShell
      footerHint={footerHint}
      integration={{
        description: "Connect your AWS account to scan and monitor cloud infrastructure.",
        icon: isDark ? <AwsDark className="size-8" /> : <AwsLight className="size-8" />,
        name: "Amazon Web Services",
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
              <IntegrationStepActionRow
                onBack={() => {
                  onOpenChange(false);
                }}
                primary={
                  <div className="flex items-center gap-2">
                    {step1Completed ? (
                      <Button
                        disabled={isLaunching}
                        onClick={() => {
                          void handleLaunchCloudFormation();
                        }}
                        type="button"
                        variant="outline"
                      >
                        {isLaunching ? <Spinner className="mr-2 size-4" /> : null}
                        Launch again
                      </Button>
                    ) : (
                      <Button
                        className={dialogPrimaryButtonClassName}
                        disabled={isLaunching}
                        onClick={() => {
                          void handleLaunchCloudFormation();
                        }}
                        type="button"
                      >
                        {isLaunching ? <Spinner className="mr-2 size-4" /> : null}
                        Launch
                      </Button>
                    )}
                    <Button
                      className={step1Completed ? dialogPrimaryButtonClassName : undefined}
                      disabled={!step1Completed}
                      onClick={() => {
                        setCurrentStep(2);
                      }}
                      type="button"
                      variant={step1Completed ? "default" : "outline"}
                    >
                      Continue
                      <ChevronRight className="ml-2 size-4" />
                    </Button>
                  </div>
                }
                showBack
              />
            ),
            content: (
              <IntegrationStepBody>
                <IntegrationStepIntro>
                  Launch our CloudFormation template in your AWS account. This creates a read-only IAM role for secure
                  resource scanning. The stack opens in a new browser tab — complete it there, then return here to
                  continue.
                </IntegrationStepIntro>
              </IntegrationStepBody>
            ),
            label: "Deploy Stack",
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
                    form="aws-connect-form"
                    type="submit"
                  >
                    {isLoading ? <Spinner className="mr-2 size-4" /> : null}
                    Connect Account
                  </Button>
                }
              />
            ),
            content: (
              <form
                id="aws-connect-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit(e);
                }}
              >
                <IntegrationStepBody>
                  <IntegrationStepIntro>
                    Enter a name for this connector and paste the IAM Role ARN from your CloudFormation stack outputs.
                  </IntegrationStepIntro>
                  <IntegrationStepFields>
                    <div className={fieldSpacing}>
                      <Label className={fieldLabelClassName} htmlFor="name">
                        Connection Name
                      </Label>
                      <Input
                        autoCapitalize="none"
                        autoComplete="off"
                        className={fieldInputClassName}
                        id="name"
                        onChange={handleCloudFormationChange("connectionName")}
                        pattern="[a-z0-9-]+"
                        placeholder="production-env"
                        required
                        spellCheck={false}
                        value={cloudFormationCreds.connectionName}
                      />
                      <IntegrationStepFieldHint>
                        Use lowercase letters, numbers, and hyphens only.
                      </IntegrationStepFieldHint>
                    </div>
                    <div className={fieldSpacing}>
                      <Label className={fieldLabelClassName} htmlFor="arn">
                        IAM Role ARN
                      </Label>
                      <div className="relative">
                        <Input
                          className={cn(fieldInputClassName, "pr-10 font-mono text-[13px]")}
                          id="arn"
                          onChange={handleCloudFormationChange("roleArn")}
                          placeholder="arn:aws:iam::123456789012:role/TruestRole"
                          required
                          value={cloudFormationCreds.roleArn}
                        />
                        <Terminal className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#666666] dark:text-muted-foreground" />
                      </div>
                      <IntegrationStepFieldHint>
                        Paste the ARN from the CloudFormation Outputs tab.
                      </IntegrationStepFieldHint>
                    </div>
                  </IntegrationStepFields>
                </IntegrationStepBody>
              </form>
            ),
            label: "Enter Connection Details",
          },
        ]}
      />
    </IntegrationDialogShell>
  );
}

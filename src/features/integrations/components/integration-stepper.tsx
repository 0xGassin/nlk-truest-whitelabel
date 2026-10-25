"use client";

import { Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface IntegrationStep {
  action?: ReactNode;
  content?: ReactNode;
  label: string;
}

const EMPTY_COMPLETED_STEPS: number[] = [];

const stepConnectorStyle = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 4px, transparent 4px, transparent 9px)",
};

interface IntegrationStepperProps {
  completedSteps?: number[];
  currentStep: number;
  steps: IntegrationStep[];
}

function StepIndicator({ isCompleted, isCurrent }: { isCompleted: boolean; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <div className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground">
        <ChevronRight className="size-3 text-background" strokeWidth={2.5} />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground">
        <Check className="size-3 text-background" strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <div className="relative z-10 size-5 shrink-0 rounded-full border border-[#d4d4d4] bg-white dark:border-border dark:bg-card" />
  );
}

export function IntegrationStepper({
  completedSteps = EMPTY_COMPLETED_STEPS,
  currentStep,
  steps,
}: IntegrationStepperProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrent = currentStep === stepNumber;
        const isCompleted = completedSteps.includes(stepNumber);
        const isUpcoming = !isCurrent && !isCompleted;
        const isLast = index === steps.length - 1;

        return (
          <div className="relative" key={stepNumber}>
            {!isLast ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[34px] bottom-[-10px] left-[26px] w-px -translate-x-1/2"
                style={stepConnectorStyle}
              />
            ) : null}

            <div
              className={cn(
                "relative rounded-lg border border-[#eaeaea] bg-white transition-opacity dark:border-border dark:bg-card",
                isUpcoming && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <StepIndicator isCompleted={isCompleted} isCurrent={isCurrent} />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent || isCompleted ? "text-foreground" : "text-[#999999] dark:text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {isCurrent && (step.content || step.action) ? (
                <div className="border-t border-[#eaeaea] dark:border-border">
                  {step.content ? <div className="space-y-5 px-4 py-4">{step.content}</div> : null}
                  {step.action ? (
                    <div className="border-t border-[#eaeaea] bg-[#fafafa] px-4 py-3 dark:border-border dark:bg-muted/40">
                      {step.action}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

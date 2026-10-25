"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface Step {
  content?: React.ReactNode;
  description?: string;
  label: string;
}

const EMPTY_COMPLETED_STEPS: number[] = [];

interface StepperProps {
  completedSteps?: number[];
  currentStep: number;
  steps: Step[];
}

export function Stepper({ completedSteps = EMPTY_COMPLETED_STEPS, currentStep, steps }: StepperProps) {
  return (
    <div className="flex flex-col">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrentStep = currentStep === stepNumber;
        const isCompleted = completedSteps.includes(stepNumber);
        const isLastStep = index === steps.length - 1;

        return (
          <div className="relative" key={stepNumber}>
            {/* Step header row */}
            <div className={cn("flex items-center gap-3", isCurrentStep ? "py-2.5" : "py-2.5")}>
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isCurrentStep
                    ? "bg-foreground text-background"
                    : isCompleted
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : stepNumber}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isCurrentStep ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Step content only shown for the active step */}
            {isCurrentStep && step.content ? (
              <div className="animate-in fade-in slide-in-from-top-2 pt-1 pb-2 pl-10 duration-200">{step.content}</div>
            ) : null}

            {/* Connector line */}
            {isLastStep ? null : <div className="absolute top-[38px] bottom-0 left-[13px] w-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

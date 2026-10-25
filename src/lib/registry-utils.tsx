/**
 * Container registry utilities
 *
 * Utilities for detecting and displaying container registry information.
 */

import { Container } from "lucide-react";

import { AwsDark } from "@/components/ui/svgs/awsDark";
import { AwsLight } from "@/components/ui/svgs/awsLight";
import { Azure } from "@/components/ui/svgs/azure";
import { Docker } from "@/components/ui/svgs/docker";
import { GcpArtifactRegistry } from "@/components/ui/svgs/gcp-artifact-registry";
import { GitHub } from "@/components/ui/svgs/github";
import { GitLab } from "@/components/ui/svgs/gitlab";
import { Quay } from "@/components/ui/svgs/quay";

/**
 * Detect the container registry from an image reference
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getRegistryFromImage(imageRef: string): string {
  if (imageRef.includes("dkr.ecr") && imageRef.includes("amazonaws.com")) return "AWS ECR";
  if (imageRef.includes("azurecr.io")) return "Azure ACR";
  if (imageRef.includes("gcr.io") || imageRef.includes("pkg.dev")) return "Google Artifact Registry";
  if (imageRef.includes("ghcr.io")) return "GitHub";
  if (imageRef.includes("registry.gitlab.com")) return "GitLab";
  if (imageRef.includes("quay.io")) return "Quay.io";
  if (!imageRef.includes("/") || imageRef.startsWith("library/") || !imageRef.includes(".")) return "Docker Hub";
  return "Custom";
}

interface RegistryIconProps {
  className?: string;
  isDark: boolean;
  registry: string;
}

/**
 * Icon component for different container registries
 */
export function RegistryIcon({ className = "w-4 h-4", isDark, registry }: RegistryIconProps) {
  switch (registry) {
    case "AWS ECR":
      return isDark ? <AwsDark className={className} /> : <AwsLight className={className} />;
    case "Azure ACR":
      return <Azure className={className} />;
    case "Docker Hub":
      return <Docker className={className} />;
    case "GitHub":
      return <GitHub className={className} />;
    case "GitLab":
      return <GitLab className={className} />;
    case "Google Artifact Registry":
      return <GcpArtifactRegistry className={className} />;
    case "Quay.io":
      return <Quay className={className} />;
    default:
      return <Container className={className} />;
  }
}

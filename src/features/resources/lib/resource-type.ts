import type { LucideIcon } from "lucide-react";

import {
  Archive,
  BrickWall,
  Cloud,
  Database,
  HelpCircle,
  KeySquare,
  Layers,
  ListTree,
  Network,
  PersonStanding,
  Server,
  Shield,
} from "lucide-react";

import { UserKey } from "@/lib/icons/user-key";

interface ResourceTypeDefinition {
  color?: string;
  icon: LucideIcon;
  plural: string;
  singular: string;
}

const serviceAliases: Record<string, string> = {
  cloudresourcemanager: "Cloud Resource Manager",
  cloudsql: "Cloud SQL",
  cloudstorage: "Cloud Storage",
  compute: "Compute Engine",
  iam: "IAM",
  logging: "Logging",
};

const acronyms = new Map([
  ["acl", "ACL"],
  ["api", "API"],
  ["arn", "ARN"],
  ["aws", "AWS"],
  ["cpu", "CPU"],
  ["db", "DB"],
  ["dns", "DNS"],
  ["ec2", "EC2"],
  ["ecr", "ECR"],
  ["gcp", "GCP"],
  ["iam", "IAM"],
  ["id", "ID"],
  ["kms", "KMS"],
  ["rds", "RDS"],
  ["s3", "S3"],
  ["sql", "SQL"],
  ["url", "URL"],
  ["vpc", "VPC"],
]);

export const resourceTypeConfig: Record<string, ResourceTypeDefinition> = {
  "cloudresourcemanager.googleapis.com/Organization": {
    icon: Layers,
    plural: "Organizations",
    singular: "Organization",
  },
  "cloudresourcemanager.googleapis.com/Policy": {
    icon: Shield,
    plural: "IAM Policies",
    singular: "IAM Policy",
  },
  "cloudresourcemanager.googleapis.com/Project": {
    icon: Layers,
    plural: "Projects",
    singular: "Project",
  },
  "cloudsql.googleapis.com/Instance": {
    icon: Database,
    plural: "Cloud SQL Instances",
    singular: "Cloud SQL Instance",
  },
  "cloudstorage.googleapis.com/Bucket": {
    icon: Archive,
    plural: "Cloud Storage Buckets",
    singular: "Cloud Storage Bucket",
  },
  "compute.googleapis.com/Disk": {
    icon: Database,
    plural: "Compute Engine Disks",
    singular: "Compute Engine Disk",
  },
  "compute.googleapis.com/Firewall": {
    icon: BrickWall,
    plural: "Firewall Rules",
    singular: "Firewall Rule",
  },
  "compute.googleapis.com/Instance": {
    icon: Server,
    plural: "Compute Engine Instances",
    singular: "Compute Engine Instance",
  },
  "compute.googleapis.com/Network": {
    icon: Network,
    plural: "VPC Networks",
    singular: "VPC Network",
  },
  "compute.googleapis.com/SecurityPolicy": {
    icon: Shield,
    plural: "Security Policies",
    singular: "Security Policy",
  },
  "compute.googleapis.com/Subnet": {
    icon: Network,
    plural: "Subnets",
    singular: "Subnet",
  },
  "compute.googleapis.com/Subnetwork": {
    icon: Network,
    plural: "Subnets",
    singular: "Subnet",
  },
  "dynamodb:table": {
    icon: Layers,
    plural: "DynamoDB Tables",
    singular: "DynamoDB Table",
  },
  "ec2:instance": {
    icon: Server,
    plural: "EC2 Instances",
    singular: "EC2 Instance",
  },
  "ec2:network_acl": {
    icon: Shield,
    plural: "Network ACLs",
    singular: "Network ACL",
  },
  "ec2:route_table": {
    icon: Network,
    plural: "Route Tables",
    singular: "Route Table",
  },
  "ec2:security_group": {
    icon: Shield,
    plural: "Security Groups",
    singular: "Security Group",
  },
  "ec2:subnet": {
    icon: Network,
    plural: "Subnets",
    singular: "Subnet",
  },
  "ec2:vpc": {
    icon: Network,
    plural: "VPCs",
    singular: "VPC",
  },
  "iam:policy": {
    icon: KeySquare,
    plural: "IAM Policies",
    singular: "IAM Policy",
  },
  "iam:role": {
    icon: KeySquare,
    plural: "IAM Roles",
    singular: "IAM Role",
  },
  "iam:user": {
    icon: PersonStanding,
    plural: "IAM Users",
    singular: "IAM User",
  },
  "iam.googleapis.com/Role": {
    icon: KeySquare,
    plural: "IAM Roles",
    singular: "IAM Role",
  },
  "iam.googleapis.com/ServiceAccount": {
    icon: UserKey,
    plural: "Service Accounts",
    singular: "Service Account",
  },
  "iam.googleapis.com/ServiceAccountKey": {
    icon: KeySquare,
    plural: "Service Account Keys",
    singular: "Service Account Key",
  },
  "lambda:function": {
    icon: Cloud,
    plural: "Lambda Functions",
    singular: "Lambda Function",
  },
  "logging.googleapis.com/LogBucket": {
    icon: Archive,
    plural: "Log Buckets",
    singular: "Log Bucket",
  },
  "logging.googleapis.com/LogSink": {
    icon: ListTree,
    plural: "Log Sinks",
    singular: "Log Sink",
  },
  "rds:cluster": {
    icon: Database,
    plural: "RDS Clusters",
    singular: "RDS Cluster",
  },
  "rds:instance": {
    icon: Database,
    plural: "RDS Instances",
    singular: "RDS Instance",
  },
  "resourceexplorer2:index": {
    icon: Layers,
    plural: "Resource Explorer Indexes",
    singular: "Resource Explorer Index",
  },
  "s3:bucket": {
    icon: Archive,
    plural: "S3 Buckets",
    singular: "S3 Bucket",
  },
};

function normalizeWord(word: string): string {
  if (!word) return "";

  const lower = word.toLowerCase();
  const acronym = acronyms.get(lower);
  if (acronym) return acronym;

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function humanizeSegment(segment: string): string {
  return String(segment ?? "")
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(normalizeWord)
    .join(" ");
}

export function getResourceIcon(type: string): LucideIcon {
  if (!(type in resourceTypeConfig)) {
    return HelpCircle;
  }
  return resourceTypeConfig[type].icon;
}

export function getResourceColor(type: string): string {
  if (!(type in resourceTypeConfig)) {
    return "text-muted-foreground";
  }
  return resourceTypeConfig[type].color ?? "text-muted-foreground";
}

const RELATIONSHIP_ACRONYMS = new Set(["api", "arn", "aws", "cpu", "ec2", "ecr", "gcp", "gpu", "http", "https", "iam", "id", "ip", "kms", "rds", "s3", "ssl", "tls", "url", "uri", "vpc"]);

/** Formats a relationship type like "member_of_vpc" into "Member of VPC". */
export function formatRelationshipType(type: string): string {
  return type
    .split("_")
    .filter(Boolean)
    .map((word) => (RELATIONSHIP_ACRONYMS.has(word) ? word.toUpperCase() : word))
    .join(" ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function formatResourceType(type: string, count: "plural" | "singular" = "singular"): string {
  if (type in resourceTypeConfig) {
    const config = resourceTypeConfig[type];
    return count === "plural" ? config.plural : config.singular;
  }
  return type
    .split(":")
    .map(humanizeSegment)
    .join(" ")
    .trim();
}

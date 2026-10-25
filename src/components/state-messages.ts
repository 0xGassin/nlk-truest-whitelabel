import type { ComponentType, SVGProps } from "react";

import { AlertCircle, BadgeCheck, Building2, Inbox, Link2, Package } from "lucide-react";

export type StateIcon = ComponentType<{ className?: string; strokeWidth?: number } & SVGProps<SVGSVGElement>>;

export interface StateMessage {
  description?: string;
  icon?: StateIcon;
  title: string;
}

export const stateMessages = {
  error: {
    description: "We could not load this section. Please try again.",
    icon: AlertCircle,
    title: "Something went wrong",
  },
  noConnections: {
    description: "Create a new connection from the Integrations page.",
    icon: Link2,
    title: "No connections found",
  },
  noData: {
    icon: Inbox,
    title: "No data",
  },
  noFrameworks: {
    description: "No compliance frameworks were found for this connection. Try running a scan.",
    icon: BadgeCheck,
    title: "No frameworks found",
  },
  noIssues: {
    description: "Create a connection and run scans to see security issues here.",
    icon: AlertCircle,
    title: "No issues found",
  },
  noOrganization: {
    description: "You are not part of any organization.",
    icon: Building2,
    title: "No organization found",
  },
  noSbom: {
    description: "Connect repositories or run container scans to see your bill of materials here.",
    icon: Package,
    title: "No SBOM data found",
  },
} as const satisfies Record<string, StateMessage>;

export type StateMessagePreset = keyof typeof stateMessages;

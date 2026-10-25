import type { SecurityIssue } from "@/services/api/integration";

import { CheckCircle2, FileText, MoreHorizontal, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SecurityIssueActionsProps {
  isIgnored?: boolean;
  issue: SecurityIssue;
  onIgnore?: () => void;
  onUnignore?: () => void;
  onViewDetails: () => void;
}

export function SecurityIssueActions({
  isIgnored = false,
  issue: _issue,
  onIgnore,
  onUnignore,
  onViewDetails,
}: SecurityIssueActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="size-8 p-0 hover:bg-[#e2e2e2] dark:hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation();
          }}
          variant="ghost"
        >
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <FileText className="mr-2 size-4" />
          View Details
        </DropdownMenuItem>

        {isIgnored
          ? onUnignore && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onUnignore();
                }}
              >
                <RotateCcw className="mr-2 size-4" />
                Unignore Issue
              </DropdownMenuItem>
            )
          : onIgnore && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onIgnore();
                }}
              >
                <CheckCircle2 className="mr-2 size-4" />
                Ignore Issue
              </DropdownMenuItem>
            )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

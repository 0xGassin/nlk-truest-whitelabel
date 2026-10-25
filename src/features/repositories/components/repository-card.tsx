import type { RepositoryHealth } from "@/services/api/integration";

import { Activity, AlertTriangle, FileCode, GitBranch, MoreHorizontal, Rocket, Settings, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RepositoryCardProps {
  health?: RepositoryHealth;
  onScan: () => void;
  onUnlink: () => void;
  repo: {
    archived?: boolean;
    description?: string;
    full_name: string;
    html_url: string;
    id: string;
    private: boolean;
  };
}

function getHealthColor(score?: number) {
  if (!score) return "text-gray-500 dark:text-muted-foreground";
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

function getHealthBadge(score?: number) {
  if (!score) return { label: "Not Scanned", variant: "secondary" as const };
  if (score >= 80) return { label: "Healthy", variant: "default" as const };
  if (score >= 50) return { label: "Needs Attention", variant: "secondary" as const };
  return { label: "Critical", variant: "destructive" as const };
}

export function RepositoryCard({ health, onScan, onUnlink, repo }: RepositoryCardProps) {
  const healthBadge = getHealthBadge(health?.health_score);
  const criticalCount = health?.security_issues?.filter((p) => p.severity === "critical").length ?? 0;
  const highCount = health?.security_issues?.filter((p) => p.severity === "high").length ?? 0;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <GitBranch className="size-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-semibold">{repo.full_name}</h3>
              {repo.private ? (
                <Badge className="text-xs" variant="outline">
                  Private
                </Badge>
              ) : null}
              {repo.archived ? (
                <Badge className="text-xs text-orange-600" variant="secondary">
                  Archived
                </Badge>
              ) : null}
            </div>
            {repo.description ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{repo.description}</p>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="size-8 shrink-0" size="icon" variant="ghost">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" onClick={onScan}>
                <Activity className="size-4" />
                Scan for Problems
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => window.open(repo.html_url, "_blank")}>
                <Settings className="size-4" />
                View on GitHub
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={onUnlink}>
                <Trash2 className="size-4" />
                Unlink Repository
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Health Score */}
        {health ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${getHealthColor(health.health_score)}`}>{health.health_score}</div>
              <div className="text-xs text-muted-foreground">
                <div>Health</div>
                <div>Score</div>
              </div>
            </div>
            <Badge className="text-xs" variant={healthBadge.variant}>
              {healthBadge.label}
            </Badge>
          </div>
        ) : null}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded bg-muted/30 p-2">
            <Rocket className="size-4 text-blue-500" />
            <div>
              <div className="font-medium">{health?.active_resource_count ?? 0}</div>
              <div className="text-muted-foreground">Resources</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded bg-muted/30 p-2">
            <FileCode className="size-4 text-purple-500" />
            <div>
              <div className="font-medium">{health?.security_issues?.length ?? 0}</div>
              <div className="text-muted-foreground">Security Issues</div>
            </div>
          </div>
        </div>

        {/* Problems Summary */}
        {health && (criticalCount > 0 || highCount > 0) ? (
          <div className="flex items-center gap-2 border-t pt-2 text-xs">
            {criticalCount > 0 ? (
              <div className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="size-3" />
                <span>{criticalCount} Critical</span>
              </div>
            ) : null}
            {highCount > 0 ? (
              <div className="flex items-center gap-1 text-orange-500">
                <AlertTriangle className="size-3" />
                <span>{highCount} High</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {health ? null : <div className="py-2 text-center text-xs text-muted-foreground">No health data available</div>}
      </CardContent>
    </Card>
  );
}

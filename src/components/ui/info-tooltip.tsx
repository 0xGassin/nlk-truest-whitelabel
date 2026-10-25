import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  side?: "bottom" | "left" | "right" | "top";
  className?: string;
}

export function InfoTooltip({ content, side = "top", className }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={cn("inline-flex cursor-help shrink-0", className)}>
          <svg
            aria-hidden="true"
            className="size-3.5"
            fill="none"
            viewBox="0 0 14 14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="fill-muted-foreground" cx="7" cy="7" r="7" />
            <text
              dominantBaseline="central"
              fill="var(--background)"
              fontFamily="system-ui, sans-serif"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
              x="7"
              y="7.5"
            >
              i
            </text>
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-[11px] leading-snug" side={side}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

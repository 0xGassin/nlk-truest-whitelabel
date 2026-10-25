"use client";

import type { LucideIcon } from "lucide-react";

import { Frown, Laugh, Meh, Smile } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/features/settings";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { feedbackService } from "@/services/api/feedback";

import { getSidebarPopupClasses } from "./sidebar-popup";

const isPathActive = (pathname: null | string, targetPath: string) => {
  if (targetPath === "#" || !pathname) return false;
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

function FeedbackModalContent({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useAuth();
  const [topic, setTopic] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [mood, setMood] = React.useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const moods = [
    { icon: Frown, value: "frown" },
    { icon: Meh, value: "meh" },
    { icon: Smile, value: "smile" },
    { icon: Laugh, value: "laugh" },
  ];

  const moodMap: Record<string, "happy" | "neutral" | "sad"> = {
    frown: "sad",
    laugh: "happy",
    meh: "neutral",
    smile: "happy",
  };

  const handleSubmit = async () => {
    if (!user?.organization?.id || !topic || !feedback || !mood) return;
    setIsSubmitting(true);
    try {
      await feedbackService.submitProductFeedback(
        user.organization.id,
        topic,
        feedback,
        moodMap[mood] ?? "neutral",
      );
      setTopic("");
      setFeedback("");
      setMood(null);
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[425px]">
      <div className="flex flex-col gap-4 p-6">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Select onValueChange={setTopic} value={topic}>
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <textarea
              className="flex min-h-[100px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-transparent soft:border-border soft:bg-white soft:hover:border-foreground/20 soft:focus-visible:border-ring"
              onChange={(e) => {
                setFeedback(e.target.value);
              }}
              placeholder="Write your feedback here..."
              value={feedback}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">How are you feeling?</span>
            <div className="flex gap-2">
              {moods.map((m) => (
                <button
                  className={cn(
                    "rounded-full p-2 transition-colors hover:bg-muted",
                    mood === m.value ? "bg-muted text-primary" : "text-muted-foreground",
                  )}
                  key={m.value}
                  onClick={() => {
                    setMood(m.value);
                  }}
                  type="button"
                >
                  <m.icon className="size-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t bg-muted/50 p-4">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button
          disabled={!topic || !feedback || !mood || isSubmitting}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </DialogContent>
  );
}

export function NavProjects({
  label,
  projects,
}: {
  label?: string;
  projects: {
    icon: LucideIcon;
    items?: {
      icon: LucideIcon;
      isFeedback?: boolean;
      name: string;
      url: string;
    }[];
    name: string;
    url: string;
  }[];
}) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const { highContrastPopups } = useTheme();
  const popup = getSidebarPopupClasses(highContrastPopups);

  const isProjectActive = (projectUrl: string) => {
    return isPathActive(pathname, projectUrl);
  };

  return (
    <Dialog onOpenChange={setFeedbackOpen} open={feedbackOpen}>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
        <SidebarMenu>
          {projects.map((item) => {
            const isActive = isProjectActive(item.url);

            if (item.items) {
              return (
                <SidebarMenuItem key={item.name}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="text-sidebar-foreground/85" tooltip={item.name}>
                        <item.icon />
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className={cn("w-48 rounded-lg", popup.content)}
                      side={isMobile ? "bottom" : "right"}
                      sideOffset={4}
                    >
                      {item.items.map((subItem) => {
                        if (subItem.isFeedback) {
                          return (
                            <DropdownMenuItem
                              className={cn("cursor-pointer gap-2", popup.item)}
                              key={subItem.name}
                              onSelect={() => {
                                setFeedbackOpen(true);
                              }}
                            >
                              <subItem.icon className="size-4" />
                              <span>{subItem.name}</span>
                            </DropdownMenuItem>
                          );
                        }

                        return (
                          <DropdownMenuItem asChild className={cn("gap-2", popup.item)} key={subItem.name}>
                            <Link href={subItem.url}>
                              <subItem.icon className="size-4" />
                              <span>{subItem.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild className="text-sidebar-foreground/85" isActive={isActive}>
                  {item.url === "#" ? (
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.name}</span>
                    </a>
                  ) : (
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
      <FeedbackModalContent
        onSubmitted={() => {
          setFeedbackOpen(false);
        }}
      />
    </Dialog>
  );
}

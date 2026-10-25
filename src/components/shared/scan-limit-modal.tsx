"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ScanLimitModalProps {
  description: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function ScanLimitModal({
  description,
  isOpen,
  onOpenChange,
  title = "Scan Frequency Limit",
}: ScanLimitModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push("/settings/billing");
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Upgrade to a higher tier to increase your scan frequency and reduce wait times between analyses.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/50 p-4">
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
            variant="ghost"
          >
            Maybe Later
          </Button>
          <Button className="gap-2" onClick={handleUpgrade}>
            Upgrade Plan
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

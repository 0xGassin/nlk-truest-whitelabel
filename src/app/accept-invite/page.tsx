"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast/toast";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { apiClient, invitationService } from "@/services/api";

interface InvitationDetails {
  email: string;
  expires_at: string;
  organization_name: string;
  role: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await apiClient.get<{ data: InvitationDetails }>(`/api/v1/invitations/token/${token}`);
        setDetails(res.data.data);
      } catch (error_) {
        const apiError = parseApiError(error_);
        logger.error("Failed to load invitation", { error: apiError.message });
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await invitationService.acceptInvitation({ token });
      toast.success("Invitation accepted!", {
        description: "You are now a member of the organization. Redirecting...",
      });
      router.push("/dashboard");
    } catch (error_) {
      const apiError = parseApiError(error_);
      logger.error("Failed to accept invitation", { error: apiError.message, statusCode: apiError.statusCode });
      if (apiError.statusCode === 401) {
        const callbackUrl = encodeURIComponent(`/accept-invite?token=${token}`);
        router.push(`/login?callbackUrl=${callbackUrl}`);
      } else {
        toast.error("Failed to accept invitation", {
          description: apiError.message,
        });
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              <CardTitle>Invitation Error</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => {
                router.push("/");
              }}
              variant="outline"
            >
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Join Organization</CardTitle>
          <CardDescription>
            You have been invited to join <strong>{details?.organization_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-balance">
          <p className="text-muted-foreground">
            Accepting this invitation will add you as a <strong>{details?.role}</strong> using the email{" "}
            <strong>{details?.email}</strong>.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={accepting}
            onClick={() => {
              void handleAccept();
            }}
            size="lg"
          >
            {accepting ? <Spinner className="mr-2 size-4" /> : null}
            Accept Invitation
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              router.push("/");
            }}
            variant="ghost"
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { useSession } from "@/components/session-provider";
import { Alert } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";

/**
 * Guards the application shell.
 *
 * A signed-in user with no organization is sent to onboarding; one whose company
 * has not finished setup is nudged there. Both are routing conveniences - the
 * API refuses tenant data to an unresolved caller regardless.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, isLoading, error, signOut } = useSession();
  const router = useRouter();

  const needsOrganization = me?.needsOrganization ?? false;

  useEffect(() => {
    if (!isLoading && needsOrganization) router.replace("/onboarding");
  }, [isLoading, needsOrganization, router]);

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas" role="status" aria-label="Loading Workeva">
        <div className="flex flex-col items-center gap-3">
          <Loader2 aria-hidden className="size-6 animate-spin text-brand-600" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-4">
        <div className="w-full max-w-md space-y-4">
          <Alert tone="danger" title="We couldn't load your account">
            {error.message}
          </Alert>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Try again</Button>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (needsOrganization) return null;

  return <AppShell>{children}</AppShell>;
}

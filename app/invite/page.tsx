"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, Card, CardBody } from "@/components/ui/surfaces";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AcceptInvitationResponse, InvitationPreviewResponse } from "@/lib/types";

const PENDING_TOKEN_KEY = "workeva.pendingInvitation";

const subscribeToNothing = () => () => {};

function readPendingToken() {
  try {
    return sessionStorage.getItem(PENDING_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * The invitation journey: see what you're joining, sign in or create an account
 * with the invited address, then accept.
 *
 * The token lives only in the URL and briefly in sessionStorage (to survive the
 * sign-up detour). Role and department come from the server's stored invitation,
 * never from the link, so editing the URL changes nothing.
 */
function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { accessToken, me, isLoading: sessionLoading, switchOrganization, refresh, signOut } = useSession();

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const fromUrl = searchParams.get("token");
  const pending = useSyncExternalStore(subscribeToNothing, readPendingToken, () => null);
  const token = fromUrl ?? pending;

  // Remember the token across the sign-up detour.
  useEffect(() => {
    if (!fromUrl) return;
    try {
      sessionStorage.setItem(PENDING_TOKEN_KEY, fromUrl);
    } catch {
      // Storage blocked; the link still works in this tab.
    }
  }, [fromUrl]);

  // The preview endpoint needs a signed-in caller; before that we show a generic prompt.
  const preview = useQuery<InvitationPreviewResponse, ApiError>({
    queryKey: ["invitation-preview", token, accessToken],
    enabled: Boolean(token && accessToken),
    retry: false,
    queryFn: () =>
      api<InvitationPreviewResponse>(`/api/invitations/preview?token=${encodeURIComponent(token ?? "")}`, {
        token: accessToken,
      }),
  });

  async function accept() {
    if (!token || !accessToken) return;
    setAccepting(true);
    setAcceptError(null);

    try {
      const result = await api<AcceptInvitationResponse>("/api/invitations/accept", {
        method: "POST",
        body: { token },
        token: accessToken,
      });

      try {
        sessionStorage.removeItem(PENDING_TOKEN_KEY);
      } catch {
        // Nothing to clear.
      }

      switchOrganization(result.organizationId);
      await refresh();
      toast.success(`Welcome to ${result.organizationName}`);
      router.replace("/dashboard");
    } catch (error) {
      setAcceptError(error instanceof ApiError ? error.message : "We couldn't accept this invitation. Please try again.");
      setAccepting(false);
    }
  }

  if (!token) {
    return (
      <Alert tone="warning" title="No invitation found">
        Open the link from your invitation email. If it has expired, ask your administrator to send a new one.
      </Alert>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-label="Loading">
        <Loader2 aria-hidden className="size-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!accessToken) {
    const returnTo = encodeURIComponent("/invite");
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">You&apos;ve been invited to Workeva</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in, or create an account using the email address the invitation was sent to. You&apos;ll come
          straight back here to accept it.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href={`/signup?next=${returnTo}`} className="sm:flex-1">
            <Button fullWidth size="lg">Create account</Button>
          </Link>
          <Link href={`/login?next=${returnTo}`} className="sm:flex-1">
            <Button fullWidth size="lg" variant="secondary">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (preview.isLoading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-label="Loading invitation">
        <Loader2 aria-hidden className="size-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (preview.error || !preview.data) {
    return (
      <div className="space-y-4">
        <Alert tone="danger" title="This invitation can't be used">
          {preview.error?.message ?? "This invitation link isn't valid."}
        </Alert>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>Go to Workeva</Button>
      </div>
    );
  }

  const invitation = preview.data;
  const wrongAccount = me && me.email.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Join {invitation.organizationName}</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        {invitation.firstName}, you&apos;ve been invited to join your team on Workeva.
      </p>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded bg-navy-950 text-white">
              <Building2 aria-hidden className="size-5" />
            </span>
            <div>
              <p className="font-medium text-slate-900">{invitation.organizationName}</p>
              <p className="text-sm text-slate-500">{invitation.email}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{invitation.roleName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Job title</dt>
              <dd className="font-medium text-slate-900">{invitation.jobTitle ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{invitation.departmentName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Expires</dt>
              <dd className="font-medium text-slate-900">{formatDate(invitation.expiresAt)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {wrongAccount && (
        <div className="mt-4">
          <Alert
            tone="warning"
            title="You're signed in with a different email"
            action={<Button size="sm" variant="secondary" onClick={signOut}>Sign out</Button>}
          >
            This invitation is for {invitation.email}. Sign out and sign in with that address to accept it.
          </Alert>
        </div>
      )}

      {acceptError && (
        <div className="mt-4">
          <Alert tone="danger">{acceptError}</Alert>
        </div>
      )}

      <Button className="mt-6" fullWidth size="lg" onClick={accept} loading={accepting} disabled={Boolean(wrongAccount)}>
        Accept invitation
      </Button>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <main id="main" className="w-full max-w-md">
        <Suspense fallback={null}>
          <InviteContent />
        </Suspense>
      </main>
    </div>
  );
}

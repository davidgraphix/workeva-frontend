"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { api, ApiError } from "@/lib/api";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { MeResponse } from "@/lib/types";

const ORGANIZATION_STORAGE_KEY = "workeva.organization";

interface SessionContextValue {
  /** Null while loading, or when signed out. */
  session: Session | null;
  accessToken: string | null;
  me: MeResponse | null;
  organizationId: string | null;
  isLoading: boolean;
  error: Error | null;
  /** UX only: the API enforces every permission independently. */
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  switchOrganization: (organizationId: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the signed-in user's session, their Workeva profile and the organization
 * they are currently acting in.
 *
 * The organization choice is remembered in localStorage purely as a convenience.
 * It is sent to the API as a hint and verified there against real membership, so
 * editing it achieves nothing.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = supabaseBrowser();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);

      // A different person signing in must not see the previous one's cached data.
      if (!nextSession) queryClient.clear();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ORGANIZATION_STORAGE_KEY);
      if (stored) setOrganizationId(stored);
    } catch {
      // Private browsing or blocked storage. The API falls back to the user's
      // single membership, which is the common case anyway.
    }
  }, []);

  const accessToken = session?.access_token ?? null;

  const meQuery = useQuery({
    queryKey: ["me", accessToken, organizationId],
    enabled: sessionReady && Boolean(accessToken),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.isRetryable && failureCount < 2,
    staleTime: 60_000,
    queryFn: () =>
      api<MeResponse>("/api/me", { token: accessToken, organizationId }),
  });

  const me = meQuery.data ?? null;

  // Settle on an organization once we know which ones exist. Without this, a user
  // with two memberships would sit on an "ambiguous organization" error forever.
  useEffect(() => {
    if (!me) return;

    if (me.active) {
      if (me.active.organizationId !== organizationId) {
        persistOrganization(me.active.organizationId);
        setOrganizationId(me.active.organizationId);
      }
      return;
    }

    const first = me.memberships[0];
    if (!organizationId && first) {
      persistOrganization(first.organizationId);
      setOrganizationId(first.organizationId);
    }
  }, [me, organizationId]);

  const switchOrganization = useCallback(
    (nextOrganizationId: string) => {
      persistOrganization(nextOrganizationId);
      setOrganizationId(nextOrganizationId);
      // Everything cached belongs to the previous organization.
      queryClient.clear();
    },
    [queryClient],
  );

  const refresh = useCallback(async () => {
    await meQuery.refetch();
  }, [meQuery]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      window.localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    queryClient.clear();
    window.location.href = "/login";
  }, [supabase, queryClient]);

  const permissions = useMemo(
    () => new Set(me?.active?.permissions ?? []),
    [me?.active?.permissions],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      accessToken,
      me,
      organizationId: me?.active?.organizationId ?? organizationId,
      isLoading: !sessionReady || (Boolean(accessToken) && meQuery.isLoading),
      error: meQuery.error as Error | null,
      can: (permission) => permissions.has(permission),
      canAny: (...checks) => checks.some((permission) => permissions.has(permission)),
      switchOrganization,
      refresh,
      signOut,
    }),
    [
      session,
      accessToken,
      me,
      organizationId,
      sessionReady,
      meQuery.isLoading,
      meQuery.error,
      permissions,
      switchOrganization,
      refresh,
      signOut,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function persistOrganization(organizationId: string) {
  try {
    window.localStorage.setItem(ORGANIZATION_STORAGE_KEY, organizationId);
  } catch {
    // Storage unavailable; the choice simply will not survive a reload.
  }
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside a SessionProvider.");
  return context;
}

/** The credentials every data hook needs, in one call. */
export function useAuthContext() {
  const { accessToken, organizationId } = useSession();
  return { token: accessToken, organizationId };
}

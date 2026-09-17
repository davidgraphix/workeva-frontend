"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import { missingPublicConfig } from "@/lib/config";
import { SessionProvider } from "./session-provider";
import { ToastProvider } from "./ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Created in state so React's strict-mode double render does not discard the
  // cache on every mount.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) =>
              error instanceof ApiError ? error.isRetryable && failureCount < 2 : failureCount < 2,
          },
          mutations: {
            // Never replay a mutation automatically: a retried clock-in or leave
            // approval could create a second record.
            retry: false,
          },
        },
      }),
  );

  const missing = missingPublicConfig();
  if (missing.length > 0) return <ConfigurationMissing missing={missing} />;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/**
 * Shown instead of a stack trace when the app was started without its public
 * configuration - most often `npm run dev` before `.env.local` exists.
 */
export function ConfigurationMissing({ missing }: { missing: string[] }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-lg rounded-[--radius-card] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Workeva isn&apos;t configured yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          These environment variables are missing:
        </p>
        <ul className="mt-3 space-y-1 rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-800">
          {missing.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{" "}
          <code className="rounded bg-slate-100 px-1">.env.local</code>, fill in the values, then restart{" "}
          <code className="rounded bg-slate-100 px-1">npm run dev</code>. All of these values are public-safe; no
          secret belongs in this file.
        </p>
      </div>
    </main>
  );
}

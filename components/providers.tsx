"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
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

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

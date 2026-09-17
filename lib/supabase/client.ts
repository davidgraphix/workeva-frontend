"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser-side Supabase client.
 *
 * Only the project URL and the anon key are used here, and both are safe to ship
 * to a browser - the anon key grants nothing on its own, because Row Level
 * Security governs what it can reach. The service-role key exists only on the
 * API host and must never appear in this repository.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. See .env.example.",
    );
  }

  return createBrowserClient(url, anonKey);
}

let browserClient: ReturnType<typeof createSupabaseBrowserClient> | undefined;

/** One client per browser tab, so the auth listener is not attached repeatedly. */
export function supabaseBrowser() {
  browserClient ??= createSupabaseBrowserClient();
  return browserClient;
}

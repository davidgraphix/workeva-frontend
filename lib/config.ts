/**
 * Public runtime configuration.
 *
 * Next.js inlines NEXT_PUBLIC_* values at build time, so they must be read with
 * literal property access (not a dynamic lookup). Every value here is safe in a
 * browser - secrets never belong in this file.
 */
export const publicConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** Names of required variables that are missing, so the app can explain instead of crashing. */
export function missingPublicConfig(): string[] {
  const missing: string[] = [];
  if (!publicConfig.apiBaseUrl) missing.push("NEXT_PUBLIC_API_BASE_URL");
  if (!publicConfig.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publicConfig.supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}

import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Supabase sends people after they click an email confirmation link. The
 * one-time code is exchanged for a session cookie on the server, so the token
 * never passes through client-side JavaScript.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Only ever redirect within this app, never to an address from the query string.
  const destination = safeRedirectPath(next);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  }

  return NextResponse.redirect(`${origin}/login?verified=0`);
}

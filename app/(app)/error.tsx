"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Catches a rendering failure inside a signed-in page so it degrades to a readable message
 * with a way forward, instead of blanking the whole application. The shell and navigation
 * stay usable. No technical detail is shown to the person.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    // Surfaced in the browser console for support; never rendered.
    console.error("Workeva page error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center" role="alert">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <AlertTriangle aria-hidden className="size-5" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">This page ran into a problem</h1>
      <p className="mt-2 text-sm text-slate-600">
        Nothing you entered has been lost on the server. Try again, or go back to your dashboard.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/surfaces";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } });

  async function onSubmit({ email }: { email: string }) {
    setFormError(null);

    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Only an infrastructure failure is reported. Whether the address exists is
    // never revealed - the confirmation below is shown either way.
    if (error && !error.message.toLowerCase().includes("user not found")) {
      setFormError("We couldn't send that email just now. Please try again in a moment.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <MailCheck aria-hidden className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Check your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          If there&apos;s a Workeva account with that email address, we&apos;ve sent a link
          for resetting the password. It expires in an hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Enter your email address and we&apos;ll send you a link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {formError && (
          <Alert tone="danger">
            <span>{formError}</span>
          </Alert>
        )}

        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          error={errors.email?.message}
          {...register("email", {
            required: "Enter your email address.",
            pattern: { value: /.+@.+\..+/, message: "Enter a valid email address." },
          })}
        />

        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to sign in
      </Link>
    </div>
  );
}

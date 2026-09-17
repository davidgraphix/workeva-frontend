"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/surfaces";
import { safeRedirectPath } from "@/lib/routes";
import { supabaseBrowser } from "@/lib/supabase/client";

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name."),
    email: z.string().min(1, "Enter your email address.").email("Enter a valid email address."),
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .regex(/[a-z]/, "Include a lower-case letter.")
      .regex(/[A-Z]/, "Include an upper-case letter.")
      .regex(/[0-9]/, "Include a number."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Those passwords don't match.",
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      // Show the first - most fundamental - problem per field, not whichever rule ran last.
      const reported = new Set<string>();
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !reported.has(field)) {
          reported.add(field);
          setError(field as keyof FormValues, { message: issue.message });
        }
      }
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();

    // Supabase Auth owns the account: it hashes the password, sends the
    // confirmation email and issues the session. Workeva never sees the password.
    const { error } = await supabaseBrowser().auth.signUp({
      email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName.trim() },
        // An invitee returns to their invitation; a founder goes on to company setup.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext() ?? "/onboarding")}`,
      },
    });

    if (error) {
      setFormError(
        error.message.toLowerCase().includes("already registered")
          ? "There's already an account with that email address. Try signing in instead."
          : "We couldn't create your account. Please try again.",
      );
      return;
    }

    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div>
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-success-50 text-success-600">
          <CheckCircle2 aria-hidden className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Check your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ve sent a confirmation link to <span className="font-medium text-slate-900">{sentTo}</span>.
          Open it to finish setting up your account.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            try a different address
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        You&apos;ll set up your company in the next step.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {formError && (
          <Alert tone="danger">
            <span>{formError}</span>
          </Alert>
        )}

        <Input
          label="Full name"
          autoComplete="name"
          autoFocus
          required
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <Input
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 10 characters, with upper and lower case letters and a number."
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-xs text-slate-600">
        Been invited by your employer? Open the link in your invitation email — it
        will bring you here and put you in the right company.
      </p>
    </div>
  );
}

/** The in-app path to return to after confirmation. Only same-origin paths are honoured. */
function safeNext(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  const safe = safeRedirectPath(next, "");
  return safe || null;
}

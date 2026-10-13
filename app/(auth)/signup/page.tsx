"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
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

const setupSteps = ["Create account", "Set up company", "Invite team"];
const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["bg-slate-200", "bg-red-500", "bg-amber-500", "bg-amber-400", "bg-emerald-500"];

/** Slim progress indicator for the overall setup flow. */
function Progress() {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-900">Step 1 of 3</span>
        <span className="text-slate-500">{setupSteps[0]}</span>
      </div>
      <ol aria-label="Setup progress" className="mt-2 grid grid-cols-3 gap-1.5">
        {setupSteps.map((label, i) => (
          <li
            key={label}
            aria-current={i === 0 ? "step" : undefined}
            className={`h-1.5 rounded-full ${i === 0 ? "bg-gradient-to-r from-blue-600 to-violet-500" : "bg-slate-200"}`}
          >
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Live feedback on the password rules, in a compact form. */
function PasswordChecklist({ password }: { password: string }) {
  const rules = [
    { label: "10+ characters", ok: password.length >= 10 },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  const score = rules.filter((r) => r.ok).length;
  const started = password.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                started && n <= score ? strengthColors[score] : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <span className="w-11 text-right text-[11px] font-semibold text-slate-600" aria-live="polite">
          {started ? strengthLabels[score] : ""}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {rules.map(({ label, ok }) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-[11px] transition-colors duration-300 ${
              ok ? "text-success-600" : "text-slate-500"
            }`}
          >
            <span
              aria-hidden
              className={`grid size-3.5 place-items-center rounded-full transition-colors duration-300 ${
                ok ? "bg-success-600 text-white" : "border border-slate-300 bg-white"
              }`}
            >
              {ok && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            {label}
            <span className="sr-only">{ok ? " (met)" : " (not met yet)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SignUpPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const password = watch("password") ?? "";

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
      <div role="status" aria-live="polite" className="anim-fade-up">
        <div className="relative mb-5 grid size-14 place-items-center rounded-2xl bg-success-50 text-success-600 ring-8 ring-success-50/60">
          <Mail aria-hidden className="size-6" />
          <span className="absolute -bottom-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-success-600 text-white ring-2 ring-white">
            <Check aria-hidden className="size-3.5" strokeWidth={3} />
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Check your email</h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          We&apos;ve sent a confirmation link to{" "}
          <span className="break-all rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-900">
            {sentTo}
          </span>
          . Open it to finish setting up your account.
        </p>

        <ol className="mt-5 space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
          {["Open the email from Workeva", "Select the confirmation link", "Set up your company"].map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="mt-6 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="rounded-sm font-medium text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            try a different address
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="anim-fade-up">
      <Progress />

      <header className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate-500">You&apos;ll set up your company in the next step.</p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5"
        noValidate
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-violet-500 to-cyan-400"
        />

        {formError && (
          <div className="mb-4" role="alert">
            <Alert tone="danger">
              <span>{formError}</span>
            </Alert>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              required
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
          </div>

          <PasswordChecklist password={password} />
        </div>

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-5">
          Create account
          {!isSubmitting && <ArrowRight aria-hidden className="size-4" />}
        </Button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck aria-hidden className="size-3.5 text-slate-400" />
          Your password is handled securely and never stored by Workeva.
        </p>
      </form>

      <footer className="mt-5 space-y-2 text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          Invited by your employer? Open the link in your invitation email. It will put you in the right company.
        </p>
      </footer>
    </div>
  );
}

/** The in-app path to return to after confirmation. Only same-origin paths are honoured. */
function safeNext(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  const safe = safeRedirectPath(next, "");
  return safe || null;
}
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/surfaces";
import { safeRedirectPath } from "@/lib/routes";
import { supabaseBrowser } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { email: "", password: "" } });

  const next = searchParams.get("next");
  const justVerified = searchParams.get("verified") === "1";
  const justReset = searchParams.get("reset") === "1";

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please check the details you entered.");
      return;
    }

    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    });

    if (error) {
      // Deliberately the same message for a wrong password and an unknown
      // address, so this form cannot be used to discover who has an account.
      setFormError(
        error.message.toLowerCase().includes("email not confirmed")
          ? "Please confirm your email address first. Check your inbox for the link we sent."
          : "That email address and password don't match. Please try again.",
      );
      return;
    }

    router.push(safeRedirectPath(next));
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1.5 text-sm text-slate-500">Welcome back. Let&apos;s get you to work.</p>

      {justVerified && (
        <div className="mt-5">
          <Alert tone="success" title="Email confirmed">
            You can sign in now.
          </Alert>
        </div>
      )}

      {justReset && (
        <div className="mt-5">
          <Alert tone="success" title="Password updated">
            Sign in with your new password.
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {formError && (
          <Alert tone="danger">
            <span>{formError}</span>
          </Alert>
        )}

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
          error={errors.email?.message}
          {...register("email", { required: "Enter your email address." })}
        />

        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register("password", { required: "Enter your password." })}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgotten your password?
            </Link>
          </div>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Setting up a new company?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <LoginForm />
    </Suspense>
  );
}

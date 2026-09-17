"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/surfaces";
import { supabaseBrowser } from "@/lib/supabase/client";

const schema = z
  .object({
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { password: "", confirmPassword: "" } });

  // Following the emailed link puts Supabase into a recovery session. Without
  // one there is nothing to update, so say so rather than failing on submit.
  useEffect(() => {
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
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

    const { error } = await supabaseBrowser().auth.updateUser({ password: parsed.data.password });

    if (error) {
      setFormError("We couldn't update your password. The link may have expired — request a new one.");
      return;
    }

    await supabaseBrowser().auth.signOut();
    router.push("/login?reset=1");
  }

  if (ready === false) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">This link has expired</h1>
        <p className="mt-2 text-sm text-slate-600">
          Password reset links are only valid for a short time. Request a new one and
          we&apos;ll send it straight over.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-slate-500">You&apos;ll use this to sign in from now on.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {formError && (
          <Alert tone="danger">
            <span>{formError}</span>
          </Alert>
        )}

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          hint="At least 10 characters, with upper and lower case letters and a number."
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" fullWidth size="lg" loading={isSubmitting} disabled={ready === null}>
          Update password
        </Button>
      </form>
    </div>
  );
}

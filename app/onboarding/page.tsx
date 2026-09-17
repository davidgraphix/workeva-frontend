"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check, Loader2, LocateFixed } from "lucide-react";

import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Alert, Card, CardBody } from "@/components/ui/surfaces";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { dayLabels, isDayInMask, toggleDayInMask } from "@/lib/format";
import { requestLocation } from "@/lib/utils";
import type { CompanySettingsResponse, OrganizationResponse, RoleResponse } from "@/lib/types";
import { EmploymentType } from "@/lib/types";

const TIMEZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg", "Africa/Cairo",
  "Africa/Casablanca", "Africa/Kigali", "Africa/Dar_es_Salaam", "Europe/London", "UTC",
];

const STEPS = ["Company", "Office", "Working hours", "Departments", "Invite team"] as const;

/**
 * Guided setup for a new company: company details, office, hours, departments and
 * a first invitation. Each step saves to the API as it completes, so leaving part
 * way through loses nothing.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { me, accessToken, isLoading, switchOrganization, refresh, signOut } = useSession();

  const [chosenStep, setStep] = useState<number | null>(null);
  const [createdOrganizationId, setOrganizationId] = useState<string | null>(null);

  // A company that already exists resumes at the office step.
  const organizationId = createdOrganizationId ?? me?.active?.organizationId ?? null;
  const step = chosenStep ?? (me?.active ? 1 : 0);

  // A user who already has a company and finished setup doesn't belong here.
  useEffect(() => {
    if (isLoading || !me) return;
    if (me.active?.onboardingCompleted) router.replace("/dashboard");
  }, [isLoading, me, router]);

  const request = <T,>(path: string, method: "GET" | "POST" | "PUT", body?: unknown) =>
    api<T>(path, { method, body, token: accessToken, organizationId });

  async function finish() {
    try {
      await request("/api/organizations/current/complete-onboarding", "POST");
      await refresh();
      toast.success("Your workspace is ready");
      router.replace("/dashboard");
    } catch (error) {
      toast.error("We couldn't finish setup", error instanceof ApiError ? error.message : undefined);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
        <Loader2 aria-hidden className="size-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 py-8 sm:py-12">
      <main id="main" className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-8 place-items-center rounded bg-navy-950 text-sm font-bold text-white">W</span>
            <span className="font-semibold text-slate-900">Set up Workeva</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>

        <ol className="mb-6 flex gap-1.5" aria-label="Setup progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${index <= step ? "bg-brand-600" : "bg-slate-200"}`} />
              <p className={`mt-1.5 hidden text-xs sm:block ${index === step ? "font-medium text-slate-900" : "text-slate-500"}`}>
                {label}
              </p>
              <span className="sr-only">
                {label}: {index < step ? "complete" : index === step ? "current step" : "not started"}
              </span>
            </li>
          ))}
        </ol>

        <Card>
          <CardBody className="sm:p-7">
            {step === 0 && (
              <CompanyStep
                defaultEmail={me?.email ?? ""}
                onCreated={async (organization) => {
                  switchOrganization(organization.id);
                  setOrganizationId(organization.id);
                  await refresh();
                  setStep(1);
                }}
                token={accessToken}
              />
            )}
            {step === 1 && organizationId && <OfficeStep request={request} onDone={() => setStep(2)} />}
            {step === 2 && organizationId && <HoursStep request={request} onDone={() => setStep(3)} />}
            {step === 3 && organizationId && <DepartmentsStep request={request} onDone={() => setStep(4)} />}
            {step === 4 && organizationId && <InviteStep request={request} onDone={finish} />}
          </CardBody>
        </Card>
      </main>
    </div>
  );
}

type Request = <T>(path: string, method: "GET" | "POST" | "PUT", body?: unknown) => Promise<T>;

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function CompanyStep({
  defaultEmail,
  token,
  onCreated,
}: {
  defaultEmail: string;
  token: string | null;
  onCreated: (organization: OrganizationResponse) => Promise<void>;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: "", email: defaultEmail, phone: "", country: "Nigeria", state: "", city: "", address: "", timezone: "Africa/Lagos" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        try {
          const organization = await api<OrganizationResponse>("/api/organizations", {
            method: "POST",
            token,
            body: {
              ...values,
              email: values.email || null,
              phone: values.phone || null,
              state: values.state || null,
              city: values.city || null,
              address: values.address || null,
            },
          });
          await onCreated(organization);
        } catch (error) {
          setFormError(error instanceof ApiError ? error.message : "We couldn't create your company. Please try again.");
        }
      })}
      className="space-y-4"
    >
      <StepHeading title="Tell us about your company" description="You can change any of this later in Settings." />
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Input label="Company name" required autoFocus error={errors.name?.message}
        {...register("name", { required: "Enter your company name." })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company email" type="email" {...register("email")} />
        <Input label="Phone number" type="tel" {...register("phone")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Country" {...register("country")} />
        <Input label="State" {...register("state")} />
        <Input label="City" {...register("city")} />
      </div>
      <Input label="Business address" {...register("address")} />
      <Select label="Timezone" required hint="Attendance times and working days follow this timezone." {...register("timezone")}>
        {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone.replace("_", " ")}</option>)}
      </Select>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting}>Create company</Button>
      </div>
    </form>
  );
}

function OfficeStep({ request, onDone }: { request: Request; onDone: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: "Head Office", address: "", latitude: "", longitude: "", radiusMeters: "100" },
  });

  async function useCurrentLocation() {
    setLocating(true);
    setFormError(null);
    try {
      const position = await requestLocation();
      setValue("latitude", position.latitude.toFixed(6));
      setValue("longitude", position.longitude.toFixed(6));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't read your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        try {
          await request("/api/locations", "POST", {
            name: values.name,
            address: values.address || null,
            latitude: Number(values.latitude),
            longitude: Number(values.longitude),
            radiusMeters: Number(values.radiusMeters),
            isActive: true,
          });
          onDone();
        } catch (error) {
          setFormError(error instanceof ApiError ? error.message : "We couldn't save the office.");
        }
      })}
    >
      <StepHeading
        title="Where does your team work?"
        description="Employees can only clock in within the radius of a work location. If you're at the office now, use your current location."
      />
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Input label="Location name" required error={errors.name?.message}
        {...register("name", { required: "Name this location." })} />
      <Input label="Address" {...register("address")} />

      <Button type="button" variant="secondary" onClick={useCurrentLocation} loading={locating}>
        <LocateFixed aria-hidden className="size-4" />
        Use my current location
      </Button>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Latitude" inputMode="decimal" required error={errors.latitude?.message}
          {...register("latitude", { required: "Required.", validate: (v) => (Math.abs(Number(v)) <= 90 && v !== "") || "Enter a latitude between -90 and 90." })} />
        <Input label="Longitude" inputMode="decimal" required error={errors.longitude?.message}
          {...register("longitude", { required: "Required.", validate: (v) => (Math.abs(Number(v)) <= 180 && v !== "") || "Enter a longitude between -180 and 180." })} />
        <Input label="Radius (metres)" type="number" min={20} max={20000} required error={errors.radiusMeters?.message}
          {...register("radiusMeters", { validate: (v) => (Number(v) >= 20 && Number(v) <= 20000) || "Between 20 and 20,000." })} />
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Skip for now</Button>
        <Button type="submit" loading={isSubmitting}>Save and continue</Button>
      </div>
    </form>
  );
}

function HoursStep({ request, onDone }: { request: Request; onDone: () => void }) {
  const [settings, setSettings] = useState<CompanySettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<CompanySettingsResponse>("/api/settings", "GET")
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : "We couldn't load your settings."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!settings) {
    return error ? <Alert tone="danger">{error}</Alert> : <Loader2 aria-label="Loading" className="mx-auto size-6 animate-spin text-brand-600" />;
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await request("/api/settings", "PUT", settings);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't save your working hours.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <StepHeading title="Working hours" description="Used to work out who arrived late and which days count as working days." />
      {error && <Alert tone="danger">{error}</Alert>}

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Working days</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {dayLabels.map((day, index) => {
            const on = isDayInMask(settings.workingDaysMask, index);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => setSettings({ ...settings, workingDaysMask: toggleDayInMask(settings.workingDaysMask, index) })}
                className={`flex h-10 min-w-12 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium ring-1 ring-inset transition-colors ${
                  on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                {on && <Check aria-hidden className="size-3.5" />}
                {day}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Start time" type="time" value={settings.workDayStart.slice(0, 5)}
          onChange={(e) => setSettings({ ...settings, workDayStart: `${e.target.value}:00` })} />
        <Input label="End time" type="time" value={settings.workDayEnd.slice(0, 5)}
          onChange={(e) => setSettings({ ...settings, workDayEnd: `${e.target.value}:00` })} />
        <Input label="Grace period (minutes)" type="number" min={0} max={240} value={settings.gracePeriodMinutes}
          hint="Arrivals within this window are on time."
          onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })} />
      </div>

      <Checkbox
        label="Require location to clock in"
        description="Employees must be inside a work location's radius. Recommended."
        checked={settings.requireLocationForAttendance}
        onChange={(e) => setSettings({ ...settings, requireLocationForAttendance: e.target.checked })}
      />

      <div className="flex justify-end pt-2">
        <Button onClick={save} loading={saving}>Save and continue</Button>
      </div>
    </div>
  );
}

function DepartmentsStep({ request, onDone }: { request: Request; onDone: () => void }) {
  const [names, setNames] = useState<string[]>(["Operations", "Sales"]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      for (const name of names) {
        try {
          await request("/api/departments", "POST", { name, description: null, managerEmployeeId: null });
        } catch (e) {
          // A department that already exists (a revisited step) is fine.
          if (!(e instanceof ApiError && e.status === 409)) throw e;
        }
      }
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't create the departments.");
    } finally {
      setSaving(false);
    }
  }

  function add() {
    const name = draft.trim();
    if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) setNames([...names, name]);
    setDraft("");
  }

  return (
    <div className="space-y-5">
      <StepHeading title="Departments" description="Group people so managers see their own teams. Add as many as you need." />
      {error && <Alert tone="danger">{error}</Alert>}

      <ul className="flex flex-wrap gap-2">
        {names.map((name) => (
          <li key={name} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-800">
            {name}
            <button type="button" aria-label={`Remove ${name}`} onClick={() => setNames(names.filter((n) => n !== name))}
              className="rounded-full px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">×</button>
          </li>
        ))}
      </ul>

      <div className="flex items-end gap-2">
        <Input label="Add a department" containerClassName="flex-1" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button variant="secondary" onClick={add}>Add</Button>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onDone}>Skip for now</Button>
        <Button onClick={save} loading={saving} disabled={names.length === 0}>Save and continue</Button>
      </div>
    </div>
  );
}

function InviteStep({ request, onDone }: { request: Request; onDone: () => void }) {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { firstName: "", lastName: "", email: "", jobTitle: "", roleId: "" },
  });

  useEffect(() => {
    request<RoleResponse[]>("/api/roles", "GET").then(setRoles).catch(() => setRoles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignable = roles.filter((r) => r.key !== "owner");

  return (
    <div className="space-y-5">
      <StepHeading title="Invite your team" description="Each person gets an email with a secure link to join. You can invite more people any time." />
      {error && <Alert tone="danger">{error}</Alert>}
      {sent.length > 0 && <Alert tone="success" title="Invitations sent">{sent.join(", ")}</Alert>}

      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setError(null);
          try {
            await request("/api/invitations", "POST", {
              ...values,
              jobTitle: values.jobTitle || null,
              departmentId: null,
              employmentType: EmploymentType.FullTime,
            });
            setSent((current) => [...current, values.email]);
            reset({ firstName: "", lastName: "", email: "", jobTitle: "", roleId: values.roleId });
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "We couldn't send that invitation.");
          }
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" required error={errors.firstName?.message} {...register("firstName", { required: "Required." })} />
          <Input label="Last name" required error={errors.lastName?.message} {...register("lastName", { required: "Required." })} />
        </div>
        <Input label="Email" type="email" required error={errors.email?.message}
          {...register("email", { required: "Enter an email address.", pattern: { value: /.+@.+\..+/, message: "Enter a valid email address." } })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Job title" {...register("jobTitle")} />
          <Select label="Role" required error={errors.roleId?.message} {...register("roleId", { required: "Choose a role." })}>
            <option value="">Choose a role</option>
            {assignable.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </Select>
        </div>
        <Button type="submit" variant="secondary" loading={isSubmitting}>Send invitation</Button>
      </form>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Button onClick={onDone}>{sent.length > 0 ? "Finish setup" : "Skip and finish"}</Button>
      </div>
    </div>
  );
}

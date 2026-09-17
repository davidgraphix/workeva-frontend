"use client";

import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/app/page-header";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { Avatar, Card, CardBody, CardHeader } from "@/components/ui/surfaces";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { EmployeeStatusBadge } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import {
  useEmployee,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useUpdateOwnProfile,
} from "@/hooks/use-workeva";
import { ApiError } from "@/lib/api";
import { formatPlainDate } from "@/lib/format";
import { employmentTypeLabels, notificationCategoryLabels } from "@/lib/types";

export default function ProfilePage() {
  const { me } = useSession();
  const employeeId = me?.active?.employeeId ?? null;
  const employee = useEmployee(employeeId);

  return (
    <>
      <PageHeader title="My profile" description="Your details and how Workeva contacts you." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {!employeeId ? (
            <Card><CardBody><p className="text-sm text-slate-600">Signed in as {me?.email}. Your account isn&apos;t linked to an employee record in this organization.</p></CardBody></Card>
          ) : employee.isLoading ? (
            <PageSkeleton />
          ) : employee.error || !employee.data ? (
            <Card><ErrorState error={employee.error} onRetry={() => employee.refetch()} /></Card>
          ) : (
            <>
              <Card>
                <CardBody className="flex flex-wrap items-center gap-4">
                  <Avatar name={employee.data.fullName} src={employee.data.photoUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-slate-900">{employee.data.fullName}</p>
                    <p className="text-sm text-slate-500">{employee.data.jobTitle ?? "—"} · {employee.data.departmentName ?? "No department"}</p>
                  </div>
                  <EmployeeStatusBadge status={employee.data.status} />
                </CardBody>
                <dl className="grid grid-cols-2 gap-4 border-t border-slate-200 p-5 text-sm sm:grid-cols-3">
                  {[
                    ["Employee ID", employee.data.employeeNumber],
                    ["Email", employee.data.email],
                    ["Manager", employee.data.managerName ?? "—"],
                    ["Employment", employmentTypeLabels[employee.data.employmentType]],
                    ["Start date", formatPlainDate(employee.data.startDate)],
                    ["Role", me?.active?.roleName ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="truncate font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <ContactForm phone={employee.data.phone} photoUrl={employee.data.photoUrl} />
            </>
          )}
        </div>
        <NotificationPreferences />
      </div>
    </>
  );
}

function ContactForm({ phone, photoUrl }: { phone: string | null; photoUrl: string | null }) {
  const update = useUpdateOwnProfile();
  const toast = useToast();
  const { register, handleSubmit, formState: { isDirty } } = useForm({ values: { phone: phone ?? "", photoUrl: photoUrl ?? "" } });

  return (
    <Card>
      <CardHeader title="Contact details" description="Other details are managed by your administrator." />
      <CardBody>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await update.mutateAsync({ phone: values.phone || null, photoUrl: values.photoUrl || null });
              toast.success("Profile updated");
            } catch (error) {
              toast.error("Couldn't save", error instanceof ApiError ? error.message : undefined);
            }
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone number" type="tel" autoComplete="tel" {...register("phone")} />
            <Input label="Photo URL" type="url" hint="A link to a profile picture." {...register("photoUrl")} />
          </div>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>Save changes</Button>
        </form>
      </CardBody>
    </Card>
  );
}

function NotificationPreferences() {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const toast = useToast();

  return (
    <Card className="self-start">
      <CardHeader title="Notifications" description="Security emails, like password resets, are always sent." />
      <CardBody>
        {preferences.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : preferences.error || !preferences.data ? (
          <ErrorState error={preferences.error} onRetry={() => preferences.refetch()} />
        ) : (
          <div className="space-y-5">
            {preferences.data.map((pref) => (
              <fieldset key={pref.category} className="space-y-2">
                <legend className="text-sm font-semibold text-slate-900">{notificationCategoryLabels[pref.category]}</legend>
                {(["inAppEnabled", "emailEnabled"] as const).map((field) => (
                  <Checkbox
                    key={field}
                    label={field === "inAppEnabled" ? "In the app" : "By email"}
                    checked={pref[field]}
                    disabled={update.isPending}
                    onChange={async (e) => {
                      const next = preferences.data!.map((p) => (p.category === pref.category ? { ...p, [field]: e.target.checked } : p));
                      try {
                        await update.mutateAsync(next);
                      } catch (error) {
                        toast.error("Couldn't save preference", error instanceof ApiError ? error.message : undefined);
                      }
                    }}
                  />
                ))}
              </fieldset>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

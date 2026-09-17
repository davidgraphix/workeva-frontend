"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/surfaces";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/session-provider";
import {
  useCreateEmployee,
  useCreateInvitation,
  useDepartments,
  useEmployees,
  useRoles,
  useUpdateEmployee,
} from "@/hooks/use-workeva";
import { ApiError } from "@/lib/api";
import { RoleKey } from "@/lib/permissions";
import { EmploymentType, employmentTypeLabels, type EmployeeDetailResponse } from "@/lib/types";

const EMPLOYMENT_TYPES = [EmploymentType.FullTime, EmploymentType.PartTime, EmploymentType.Contract, EmploymentType.Intern];

function fieldErrorsInto(error: unknown, setError: (name: never, e: { message: string }) => void) {
  if (error instanceof ApiError) {
    for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
      setError(field as never, { message: messages[0] ?? "Invalid value." });
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function InviteEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const roles = useRoles();
  const departments = useDepartments();
  const invite = useCreateInvitation();
  const toast = useToast();
  const { me } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  // Only an owner can invite another owner; the API enforces it, this just avoids offering it.
  const assignableRoles = (roles.data ?? []).filter(
    (role) => role.key !== RoleKey.owner || me?.active?.roleKey === RoleKey.owner,
  );
  const defaultRole = assignableRoles.find((r) => r.key === RoleKey.employee)?.id ?? "";

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
    values: { firstName: "", lastName: "", email: "", jobTitle: "", departmentId: "", roleId: defaultRole, employmentType: String(EmploymentType.FullTime) },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite an employee"
      description="They'll get an email with a secure link to join. The link expires after 72 hours."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={invite.isPending}>Cancel</Button>
          <Button type="submit" form="invite-form" loading={invite.isPending}>Send invitation</Button>
        </>
      }
    >
      <form
        id="invite-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          try {
            await invite.mutateAsync({
              ...values,
              jobTitle: values.jobTitle || null,
              departmentId: values.departmentId || null,
              employmentType: Number(values.employmentType),
            });
            toast.success("Invitation sent", `We've emailed ${values.email}.`);
            reset();
            onClose();
          } catch (error) {
            setFormError(fieldErrorsInto(error, setError as never));
          }
        })}
      >
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" required error={errors.firstName?.message} {...register("firstName", { required: "Enter a first name." })} />
          <Input label="Last name" required error={errors.lastName?.message} {...register("lastName", { required: "Enter a last name." })} />
        </div>
        <Input label="Work email" type="email" required error={errors.email?.message}
          {...register("email", { required: "Enter an email address.", pattern: { value: /.+@.+\..+/, message: "Enter a valid email address." } })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Job title" {...register("jobTitle")} />
          <Select label="Department" {...register("departmentId")}>
            <option value="">No department</option>
            {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Role" required error={errors.roleId?.message} hint="Decides what they can see and do." {...register("roleId", { required: "Choose a role." })}>
            <option value="">Choose a role</option>
            {assignableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select label="Employment type" {...register("employmentType")}>
            {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{employmentTypeLabels[t]}</option>)}
          </Select>
        </div>
      </form>
    </Dialog>
  );
}

/** Create (no employee passed) or edit an employee's work record. */
export function EmployeeDialog({ open, onClose, employee }: { open: boolean; onClose: () => void; employee?: EmployeeDetailResponse | null }) {
  const departments = useDepartments();
  const managers = useEmployees({ pageSize: 100, status: 0 });
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    values: {
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      employeeNumber: employee?.employeeNumber ?? "",
      jobTitle: employee?.jobTitle ?? "",
      departmentId: employee?.departmentId ?? "",
      managerId: employee?.managerId ?? "",
      employmentType: String(employee?.employmentType ?? EmploymentType.FullTime),
      startDate: employee?.startDate ?? "",
    },
  });

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={employee ? `Edit ${employee.fullName}` : "Add an employee"}
      description={employee ? undefined : "Adds a record without an account. Use Invite if they should sign in."}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="employee-form" loading={pending}>{employee ? "Save changes" : "Add employee"}</Button>
        </>
      }
    >
      <form
        id="employee-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          const shared = {
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone || null,
            jobTitle: values.jobTitle || null,
            departmentId: values.departmentId || null,
            managerId: values.managerId || null,
            employmentType: Number(values.employmentType),
            startDate: values.startDate || null,
          };
          try {
            if (employee) {
              await update.mutateAsync({ id: employee.id, body: { ...shared, photoUrl: employee.photoUrl } });
              toast.success("Employee updated");
            } else {
              await create.mutateAsync({ ...shared, email: values.email, employeeNumber: values.employeeNumber || null });
              toast.success("Employee added");
            }
            onClose();
          } catch (error) {
            setFormError(fieldErrorsInto(error, setError as never));
          }
        })}
      >
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" required error={errors.firstName?.message} {...register("firstName", { required: "Enter a first name." })} />
          <Input label="Last name" required error={errors.lastName?.message} {...register("lastName", { required: "Enter a last name." })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Work email" type="email" required={!employee} disabled={Boolean(employee)} error={errors.email?.message}
            hint={employee ? "Email can't be changed here." : undefined}
            {...register("email", { required: employee ? false : "Enter an email address." })} />
          <Input label="Phone" type="tel" {...register("phone")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Employee ID" disabled={Boolean(employee)} hint={employee ? undefined : "Leave blank to generate one."} {...register("employeeNumber")} />
          <Input label="Job title" {...register("jobTitle")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Department" error={errors.departmentId?.message} {...register("departmentId")}>
            <option value="">No department</option>
            {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Manager" error={errors.managerId?.message} {...register("managerId")}>
            <option value="">No manager</option>
            {(managers.data?.items ?? []).filter((m) => m.id !== employee?.id).map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Employment type" {...register("employmentType")}>
            {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{employmentTypeLabels[t]}</option>)}
          </Select>
          <Input label="Start date" type="date" {...register("startDate")} />
        </div>
      </form>
    </Dialog>
  );
}

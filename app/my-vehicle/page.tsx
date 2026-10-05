"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DriverShell } from "../../components/DriverShell";
import { StatusBadge } from "../../components/StatusBadge";
import { Notice, PageHeader, Panel, Skeleton } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { formatDate } from "../../lib/format";

type Status = { code: string; label: string };
type Reminder = { title: string; date: string | null; status: Status | null };
type AlertItem = { id: string; message: string; dueDate: string | null };
type Profile = { name: string; mobile: string | null; photoUrl: string | null };
type Vehicle = {
  assigned: boolean;
  plateNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuelType: Status | null;
  fuelLiters: number | null;
  odometerKm: number | null;
  insurance: {
    insurer: string;
    policyNumber: string;
    type: Status;
    startDate: string | null;
    expiryDate: string | null;
    status: Status;
  } | null;
  reminders: Reminder[];
  alerts: AlertItem[];
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function MyVehiclePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ data: Profile }>("/me/profile"),
      api<{ data: Vehicle }>("/me/vehicle"),
      api<{ data: { unread: number } }>("/me/messages/unread"),
    ])
      .then(([profileResult, vehicleResult, unreadResult]) => {
        setProfile(profileResult.data);
        setVehicle(vehicleResult.data);
        setUnread(unreadResult.data.unread);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load your dashboard"));
  }, []);

  const urgent = vehicle?.reminders.filter((item) => item.status?.code === "expired") ?? [];
  const soon = vehicle?.reminders.filter((item) => item.status?.code === "expiring_soon") ?? [];

  const modelLine = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");

  return (
    <DriverShell>
      <PageHeader
        title={profile ? `Hello, ${profile.name.split(" ")[0]}` : "My vehicle"}
        description="Your assigned car, documents, and the next things to do."
      />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!vehicle && !error ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-24 lg:col-span-2" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      ) : null}
      {vehicle ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["/my-vehicle", "Vehicle"],
            ["/messages", "Messages"],
            ["/my-documents", "Documents"],
            ["/my-violations", "Violations"],
            ["/fuel/new", "Fuel"],
            ["/trips/new", "Trip"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg border border-line bg-card px-3 py-3 text-sm font-medium text-brand shadow-[0_1px_2px_rgba(28,36,52,0.05)] transition duration-150 ease-out hover:border-brand-mid">
              {label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {profile ? (
          <Link href="/profile" className="flex items-center gap-4 rounded-md border border-line bg-card p-4 sm:p-5 lg:col-span-2">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-md bg-brand text-sm font-semibold text-white">{initials(profile.name) || "DR"}</span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-ink">{profile.name}</span>
              <span className="mt-0.5 block text-sm text-muted">{profile.mobile || "Phone not recorded"}</span>
              <span className="mt-1 block text-sm font-medium text-accent">View profile</span>
            </span>
          </Link>
        ) : <div className="hidden lg:col-span-2 lg:block" />}

        {unread > 0 ? (
          <Link href="/messages" className="flex flex-col justify-center rounded-md border border-status-warn bg-status-warn-bg px-4 py-4 text-sm text-status-warn sm:px-5">
            <span className="font-semibold">{unread === 1 ? "1 unread message" : `${unread} unread messages`}</span>
            <span className="mt-1">Open messages from the fleet office.</span>
          </Link>
        ) : (
          <div className="hidden rounded-md border border-line bg-card px-4 py-4 text-sm text-muted sm:px-5 lg:flex lg:flex-col lg:justify-center">
            <span className="font-semibold text-ink">Messages</span>
            <span className="mt-1">No unread messages from the fleet office.</span>
          </div>
        )}
      </div>

      {urgent.length > 0 || soon.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {urgent.length > 0 ? (
            <Notice tone="danger">
              <p className="font-semibold">Expired</p>
              <ul className="mt-1">
                {urgent.map((item) => <li key={item.title}>{item.title} expired on {formatDate(item.date)}</li>)}
              </ul>
            </Notice>
          ) : null}
          {soon.length > 0 ? (
            <Notice tone="warn">
              <p className="font-semibold">Expiring soon</p>
              <ul className="mt-1">
                {soon.map((item) => <li key={item.title}>{item.title} expires {formatDate(item.date)}</li>)}
              </ul>
            </Notice>
          ) : null}
        </div>
      ) : null}

      {vehicle ? (
        <div className="mt-4 space-y-4">
          <div className="grid items-start gap-4 xl:grid-cols-3">
            <Panel title="My assigned car" className="xl:col-span-2" extra={vehicle.assigned ? <span className="text-sm font-semibold text-ink">{vehicle.plateNumber}</span> : null}>
              {vehicle.assigned && vehicle.plateNumber ? (
                <>
                  <p className="text-sm text-muted">{modelLine}</p>
                  <dl className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                    <Fact label="Vehicle number" value={vehicle.plateNumber} />
                    <Fact label="Car model" value={modelLine || "Not recorded"} />
                    <Fact label="Fuel type" value={vehicle.fuelType?.label ?? "Not recorded"} />
                    <Fact label="Fuel litres" value={vehicle.fuelLiters == null ? "Not recorded" : `${vehicle.fuelLiters.toLocaleString("en-US")} L`} />
                    <Fact label="Color" value={vehicle.color ?? "Not recorded"} />
                    <Fact label="Odometer" value={vehicle.odometerKm == null ? "Not recorded" : `${vehicle.odometerKm.toLocaleString("en-US")} km`} />
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted">No car is assigned to you yet.</p>
              )}
            </Panel>

            <Panel title="Insurance details" extra={vehicle.insurance?.status ? <StatusBadge code={vehicle.insurance.status.code} label={vehicle.insurance.status.label} /> : <StatusBadge label="Not recorded" />}>
              {vehicle.insurance ? (
                <dl className="grid gap-4">
                  <FactPlain label="Insurer" value={vehicle.insurance.insurer} />
                  <FactPlain label="Policy" value={vehicle.insurance.policyNumber} />
                  <FactPlain label="Cover" value={vehicle.insurance.type.label} />
                  <FactPlain label="Start date" value={formatDate(vehicle.insurance.startDate)} />
                  <FactPlain label="Expiry date" value={formatDate(vehicle.insurance.expiryDate)} />
                </dl>
              ) : (
                <p className="text-sm text-muted">No insurance record for this car.</p>
              )}
            </Panel>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">Reminders and alerts</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {vehicle.reminders.map((item) => (
                <article key={item.title} className="rounded-md border border-line bg-card p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <StatusBadge code={item.status?.code} label={item.status?.label ?? "Not recorded"} />
                  </div>
                  <p className="mt-3 text-sm text-muted">{item.date ? formatDate(item.date) : "Not recorded"}</p>
                </article>
              ))}
            </div>
          </section>

          <Panel title="Emergency alerts">
            {vehicle.alerts.length === 0 ? (
              <p className="text-sm text-muted">No emergency alerts.</p>
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {vehicle.alerts.map((alert) => (
                  <li key={alert.id} className="rounded-md border border-status-danger bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
                    <p>{alert.message}</p>
                    {alert.dueDate ? <p className="mt-1 text-xs">Due {formatDate(alert.dueDate)}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}
    </DriverShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function FactPlain({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

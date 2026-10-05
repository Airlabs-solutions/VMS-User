"use client";

import { FormEvent, useState } from "react";
import { DriverShell } from "../../../components/DriverShell";
import { Notice, PageHeader, Panel, PrimaryButton, TextInput } from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";

export default function NewTripPage() {
  const [form, setForm] = useState({ date: "", startLocation: "", endLocation: "", startKm: "", endKm: "", purpose: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    try {
      const result = await api<{ data: { distanceKm: number } }>("/me/trips", {
        method: "POST",
        body: { ...form, startKm: Number(form.startKm), endKm: Number(form.endKm) },
      });
      setMessage(`Trip saved. Distance ${result.data.distanceKm.toLocaleString("en-US")} km.`);
      setForm({ date: "", startLocation: "", endLocation: "", startKm: "", endKm: "", purpose: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the trip");
    } finally {
      setPending(false);
    }
  }

  return (
    <DriverShell>
      <PageHeader title="Log a trip" description="Record the start, end, and purpose of a trip in your assigned car." />
      <form onSubmit={onSubmit} className="max-w-3xl">
        <Panel title="Trip entry">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["date", "Date", "date"],
                ["startLocation", "Start location", "text"],
                ["endLocation", "End location", "text"],
                ["startKm", "Start odometer (km)", "text"],
                ["endKm", "End odometer (km)", "text"],
                ["purpose", "Purpose", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1.5 block font-medium">{label}</span>
                <TextInput
                  type={type}
                  required={key !== "purpose"}
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
          {message ? <div className="mt-4"><Notice tone="ok">{message}</Notice></div> : null}
          {error ? <div className="mt-4"><Notice tone="danger">{error}</Notice></div> : null}
          <PrimaryButton className="mt-5" disabled={pending}>{pending ? "Saving..." : "Save trip"}</PrimaryButton>
        </Panel>
      </form>
    </DriverShell>
  );
}

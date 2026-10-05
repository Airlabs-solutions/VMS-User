"use client";

import { FormEvent, useState } from "react";
import { DriverShell } from "../../../components/DriverShell";
import { Notice, PageHeader, Panel, PrimaryButton, TextInput } from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";

export default function NewFuelPage() {
  const [form, setForm] = useState({ date: "", liters: "", cost: "", odometerKm: "", station: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    try {
      await api("/me/fuel", {
        method: "POST",
        body: { ...form, liters: Number(form.liters), cost: Number(form.cost), odometerKm: Number(form.odometerKm) },
      });
      setMessage("Fuel entry submitted for approval.");
      setForm({ date: "", liters: "", cost: "", odometerKm: "", station: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the fuel entry");
    } finally {
      setPending(false);
    }
  }

  return (
    <DriverShell>
      <PageHeader title="Log fuel" description="Submit a fuel entry for your assigned car. It stays pending until the office approves it." />
      <form onSubmit={onSubmit} className="max-w-3xl">
        <Panel title="Fuel entry">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
            <Field label="Liters" value={form.liters} onChange={(value) => setForm({ ...form, liters: value })} />
            <Field label="Cost (SAR)" value={form.cost} onChange={(value) => setForm({ ...form, cost: value })} />
            <Field label="Odometer (km)" value={form.odometerKm} onChange={(value) => setForm({ ...form, odometerKm: value })} />
            <Field label="Station" value={form.station} onChange={(value) => setForm({ ...form, station: value })} required={false} />
          </div>
          {message ? <div className="mt-4"><Notice tone="ok">{message}</Notice></div> : null}
          {error ? <div className="mt-4"><Notice tone="danger">{error}</Notice></div> : null}
          <PrimaryButton className="mt-5" disabled={pending}>{pending ? "Submitting..." : "Submit"}</PrimaryButton>
        </Panel>
      </form>
    </DriverShell>
  );
}

function Field({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <TextInput type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

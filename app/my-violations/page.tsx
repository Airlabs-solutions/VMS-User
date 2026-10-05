"use client";

import { useEffect, useState } from "react";
import { DriverShell } from "../../components/DriverShell";
import { StatusBadge } from "../../components/StatusBadge";
import { Notice, PageHeader, Panel, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { formatDate, formatSarHalalas } from "../../lib/format";

type Row = { id: string; number: string; date: string; type: string; amount: { halalas: number }; status: { code?: string; label: string } };

export default function ViolationsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ data: Row[] }>("/me/violations")
      .then((result) => setRows(result.data))
      .catch(() => {
        setRows([]);
        setError("Could not load your violations.");
      });
  }, []);
  return (
    <DriverShell>
      <PageHeader title="My violations" description="Saher violations recorded against your assigned car." />
      {error ? <div className="mb-4"><Notice tone="danger">{error}</Notice></div> : null}
      {rows === null ? <Skeleton className="h-40" /> : null}
      {rows?.length === 0 ? <Panel><p className="text-sm text-muted">No Saher violations on your record.</p></Panel> : null}
      {rows && rows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(28,36,52,0.05)]">
          <div className="hidden grid-cols-5 gap-4 border-b border-line bg-canvas px-4 py-3 text-xs font-semibold text-muted sm:grid sm:px-5">
            <span>Number</span>
            <span>Date</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.id} className="grid gap-2 border-b border-line px-4 py-4 text-sm last:border-b-0 sm:grid-cols-5 sm:items-center sm:gap-4 sm:px-5">
                <p className="font-semibold text-ink">{row.number}</p>
                <p className="text-muted">{formatDate(row.date)}</p>
                <p>{row.type}</p>
                <p>{formatSarHalalas(row.amount.halalas)}</p>
                <StatusBadge code={row.status.code} label={row.status.label} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DriverShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DriverShell } from "../../components/DriverShell";
import { StatusBadge } from "../../components/StatusBadge";
import { Notice, PageHeader, Panel, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";

type Status = { code: string; label: string };
type Docs = {
  documents: {
    licenseExpiry: string | null;
    licenseStatus: Status;
    iqamaExpiry: string | null;
    iqamaStatus: Status;
    licenseNumber: string | null;
    iqamaNumber: string | null;
  };
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Docs["documents"] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ data: Docs }>("/me/vehicle")
      .then((result) => setDocs(result.data.documents))
      .catch(() => setError("Could not load your documents."));
  }, []);
  return (
    <DriverShell>
      <PageHeader title="My documents" description="License and iqama details for your driver account." />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!docs && !error ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : null}
      {docs ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Driving license" extra={<StatusBadge code={docs.licenseStatus.code} label={docs.licenseStatus.label} />}>
            <p className="text-sm text-muted">License number</p>
            <p className="mt-1 text-base font-semibold">{docs.licenseNumber || "Not recorded"}</p>
            <p className="mt-4 text-sm text-muted">Expires</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(docs.licenseExpiry)}</p>
          </Panel>
          <Panel title="Iqama" extra={<StatusBadge code={docs.iqamaStatus.code} label={docs.iqamaStatus.label} />}>
            <p className="text-sm text-muted">Iqama number</p>
            <p className="mt-1 text-base font-semibold">{docs.iqamaNumber || "Not recorded"}</p>
            <p className="mt-4 text-sm text-muted">Expires</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(docs.iqamaExpiry)}</p>
          </Panel>
        </div>
      ) : null}
    </DriverShell>
  );
}

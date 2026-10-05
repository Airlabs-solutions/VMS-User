export function StatusBadge({ code, label }: { code?: string | null; label: string }) {
  const tone = !code
    ? "bg-status-muted-bg text-status-muted"
    : ["valid", "ok", "active", "paid"].includes(code)
      ? "bg-status-ok-bg text-status-ok"
      : ["expiring_soon", "due_soon"].includes(code)
        ? "bg-status-warn-bg text-status-warn"
        : "bg-status-danger-bg text-status-danger";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>;
}

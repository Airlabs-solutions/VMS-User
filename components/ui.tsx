import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Panel({ title, extra, children, className = "" }: { title?: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(28,36,52,0.05)] ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {extra}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Notice({ tone, children }: { tone: "danger" | "warn" | "ok" | "muted"; children: ReactNode }) {
  const styles = tone === "ok"
    ? "border-status-ok bg-status-ok-bg text-status-ok"
    : tone === "danger"
      ? "border-status-danger bg-status-danger-bg text-status-danger"
      : tone === "warn"
        ? "border-status-warn bg-status-warn-bg text-status-warn"
        : "border-line bg-card text-ink";
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`notice-in rounded-lg border px-4 py-3 text-sm leading-6 ${styles}`}>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-md border border-line bg-card px-3 text-sm text-ink transition duration-150 ease-out outline-none placeholder:text-muted hover:border-brand-mid focus:border-brand focus:ring-2 focus:ring-brand/15 ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition duration-150 ease-out hover:bg-brand-strong active:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`inline-flex h-10 items-center justify-center rounded-md border border-line bg-card px-4 text-sm font-medium text-ink transition duration-150 ease-out hover:border-brand-mid hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {children}
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line ${className}`} aria-hidden="true" />;
}

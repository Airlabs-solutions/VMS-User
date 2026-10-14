"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { clearProfile, loadProfile } from "../lib/profile";

type IconName = "home" | "messages" | "documents" | "violations" | "fuel" | "trip" | "profile" | "more";

const groups: { label: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/my-vehicle", label: "My Vehicle", icon: "home" },
      { href: "/messages", label: "Messages", icon: "messages" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/my-documents", label: "Documents", icon: "documents" },
      { href: "/my-violations", label: "Violations", icon: "violations" },
    ],
  },
  {
    label: "Entries",
    items: [
      { href: "/fuel/new", label: "Fuel", icon: "fuel" },
      { href: "/trips/new", label: "Trip", icon: "trip" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/profile", label: "Profile", icon: "profile" }],
  },
];

const flatLinks = groups.flatMap((group) => group.items);

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/my-vehicle", label: "Home", icon: "home" },
  { href: "/messages", label: "Messages", icon: "messages" },
  { href: "/fuel/new", label: "Fuel", icon: "fuel" },
  { href: "/trips/new", label: "Trip", icon: "trip" },
];

const moreLinks = [
  { href: "/my-documents", label: "Documents", icon: "documents" as const },
  { href: "/my-violations", label: "Violations", icon: "violations" as const },
  { href: "/profile", label: "Profile", icon: "profile" as const },
];

const morePaths = new Set(moreLinks.map((item) => item.href));

type ShellProfile = {
  name: string;
  mobile: string | null;
  photoUrl: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DriverShell({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);
  const current = flatLinks.find((item) => item.href === path);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("vms-driver-sidebar") === "collapsed");
    } catch {
      setCollapsed(false);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("vms-driver-sidebar", next ? "collapsed" : "expanded");
      } catch {
        /* The sidebar still toggles for this visit. */
      }
      return next;
    });
  }

  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    let active = true;
    loadProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setVerified(result.verified || result.complete);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!verified && path !== "/profile/complete") router.replace("/profile/complete");
    if (verified && path === "/profile/complete") router.replace("/my-vehicle");
  }, [ready, verified, path, router]);

  useEffect(() => {
    if (!verified) return;
    if (path === "/messages") {
      setUnread(0);
      return;
    }
    api<{ data: { unread: number } }>("/me/messages/unread")
      .then((result) => setUnread(result.data.unread))
      .catch(() => setUnread(0));
  }, [path, verified]);

  function signOut() {
    clearProfile();
    void api("/auth/logout", { method: "POST" }).finally(() => {
      window.location.href = "/login";
    });
  }

  const moreActive = moreOpen || morePaths.has(path);
  const waiting = !ready || (!verified && path !== "/profile/complete") || (verified && path === "/profile/complete");

  if (waiting) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <p className="text-sm text-muted">Loading your account...</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="flex h-14 items-center justify-between border-b border-line bg-card px-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-xs font-semibold text-ink">VMS</span>
            <p className="text-sm font-semibold text-ink">Complete your profile</p>
          </div>
          <button type="button" className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink hover:bg-brand-soft" onClick={signOut}>
            Sign out
          </button>
        </header>
        <main className="driver-main">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex lg:h-screen lg:overflow-hidden">
      <aside className={`hidden lg:flex lg:h-screen lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-card lg:transition-[width] lg:duration-300 lg:ease-out ${collapsed ? "lg:w-[76px]" : "lg:w-[248px]"}`}>
        <div className="flex h-16 items-center gap-3 border-b border-line px-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand text-xs font-semibold text-ink">VMS</span>
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Vehicle Management</p>
              <p className="text-xs text-muted">Driver portal</p>
            </div>
          )}
        </div>
        <SideNav path={path} unread={unread} collapsed={collapsed} />
        <div className="border-t border-line p-3">
          <Link href="/profile" title={profile?.name || "Profile"} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-brand-soft">
            <AccountMark profile={profile} />
            {collapsed ? null : (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{profile?.name || "Driver"}</span>
                <span className="block truncate text-xs text-muted">{profile?.mobile || "Phone not recorded"}</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            className="mt-2 h-10 w-full rounded-md border border-line bg-card px-3 text-sm font-medium text-ink transition duration-150 ease-out hover:border-brand hover:bg-brand-soft"
            onClick={signOut}
          >
            {collapsed ? "Out" : "Sign out"}
          </button>
          <button
            type="button"
            className="mt-2 hidden h-10 w-full rounded-md text-sm font-medium text-muted hover:bg-brand-soft hover:text-ink lg:inline-flex lg:items-center lg:justify-center"
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card px-4 lg:px-8">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-line text-ink lg:hidden"
            aria-label="Open menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <MenuIcon />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{current?.label ?? "Driver portal"}</p>
          <button
            type="button"
            className="h-10 shrink-0 rounded-md border border-line bg-card px-3 text-sm font-medium text-ink hover:border-brand hover:bg-brand-soft lg:hidden"
            onClick={signOut}
          >
            Sign out
          </button>
        </header>
        <main key={path} className={bleed ? "page-enter flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0" : "driver-main page-enter"}>{children}</main>
      </div>

      {moreOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}
      {moreOpen ? (
        <aside className="driver-drawer fixed inset-y-0 left-0 z-[60] flex w-[min(100%,280px)] flex-col border-r border-line bg-card pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_8px_24px_rgba(17,22,16,0.12)] lg:hidden lg:pb-0" role="dialog" aria-label="Menu">
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <span className="text-sm font-semibold text-ink">Menu</span>
            <button type="button" className="h-10 rounded-md px-3 text-sm font-medium text-brand-deep" onClick={() => setMoreOpen(false)}>
              Close
            </button>
          </div>
          <SideNav path={path} unread={unread} collapsed={false} />
          <div className="border-t border-line p-3">
            <button type="button" className="h-10 w-full rounded-md border border-line text-sm font-medium text-ink" onClick={signOut}>
              Sign out
            </button>
          </div>
        </aside>
      ) : null}

      <nav className="driver-tabbar fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card lg:hidden" aria-label="Driver">
        <ul className="grid h-14 grid-cols-5">
          {tabs.map((item) => {
            const active = path === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-1 px-0.5 text-[11px] leading-none whitespace-nowrap transition-colors duration-150 ${active ? "font-semibold text-ink" : "font-medium text-muted"}`}
                >
                  {active ? <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-md bg-brand" /> : null}
                  <span className="relative">
                    <NavIcon name={item.icon} className="h-[22px] w-[22px]" />
                    {item.href === "/messages" && unread > 0 ? (
                      <span className="absolute -top-1.5 -right-2 min-w-4 rounded-md bg-highlight px-1 text-center text-[10px] leading-4 font-semibold text-ink">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-current={moreActive ? "page" : undefined}
              className={`relative flex h-full w-full flex-col items-center justify-center gap-1 px-0.5 text-[11px] leading-none whitespace-nowrap transition-colors duration-150 ${moreActive ? "font-semibold text-ink" : "font-medium text-muted"}`}
              onClick={() => setMoreOpen(true)}
            >
              {moreActive ? <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-md bg-brand" /> : null}
              <NavIcon name="more" className="h-[22px] w-[22px]" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function SideNav({ path, unread, collapsed }: { path: string; unread: number; collapsed: boolean }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Driver">
      {groups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          {collapsed ? null : <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">{group.label}</p>}
          <ul className="grid gap-1">
            {group.items.map((item) => {
              const active = path === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition duration-150 ease-out ${active ? "bg-brand-soft font-medium text-ink shadow-[inset_3px_0_0_#a8d95b]" : "text-ink hover:bg-brand-soft"}`}
                  >
                    <NavIcon name={item.icon} />
                    {collapsed ? null : <span className="min-w-0 flex-1">{item.label}</span>}
                    {!collapsed && item.href === "/messages" && unread > 0 ? (
                      <span className="rounded-md bg-highlight px-1.5 py-0.5 text-xs font-semibold text-ink">{unread}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function AccountMark({ profile }: { profile: ShellProfile | null }) {
  if (profile?.photoUrl) {
    return <img src={profile.photoUrl} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-md object-cover" />;
  }
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand text-xs font-semibold text-ink">
      {initials(profile?.name ?? "") || "DR"}
    </span>
  );
}

function NavIcon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      {name === "home" ? (
        <>
          <path d="M4 10.5 12 4l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 9.8V20h11V9.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "messages" ? <path d="M5 6.5h14v8.5H8.5L5 18.5z" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === "documents" ? (
        <>
          <path d="M7 3.5h7l4 4V20.5H7z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "violations" ? (
        <>
          <path d="M12 4 3.5 19h17L12 4z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 10v4" strokeLinecap="round" />
          <path d="M12 16.5h.01" strokeLinecap="round" />
        </>
      ) : null}
      {name === "fuel" ? <path d="M12 3.5s5.5 5.6 5.5 9.2a5.5 5.5 0 0 1-11 0C6.5 9.1 12 3.5 12 3.5z" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === "trip" ? (
        <>
          <circle cx="12" cy="7" r="2.25" />
          <path d="M5.5 19.5c1.6-5 3.6-7.5 6.5-7.5s4.9 2.5 6.5 7.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "profile" ? (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 19.5c1.4-3 3.4-4.5 6.5-4.5s5.1 1.5 6.5 4.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "more" ? (
        <>
          <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.25" fill="currentColor" stroke="none" />
        </>
      ) : null}
    </svg>
  );
}

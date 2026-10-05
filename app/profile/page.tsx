"use client";

import { FormEvent, useEffect, useState } from "react";
import { DriverShell } from "../../components/DriverShell";
import { StatusBadge } from "../../components/StatusBadge";
import { Notice, PageHeader, Panel, PrimaryButton, SecondaryButton, Skeleton, TextInput } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { formatDate } from "../../lib/format";

type Status = { code: string; label: string };
type Profile = {
  name: string;
  mobile: string | null;
  driverId: string;
  licenseNumber: string | null;
  licenseType: Status;
  licenseExpiry: string | null;
  licenseStatus: Status;
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ data: Profile }>("/me/profile")
      .then((result) => {
        setProfile(result.data);
        setName(result.data.name);
        setMobile(result.data.mobile ?? "");
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load your profile"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (photo) {
        const form = new FormData();
        form.append("file", photo);
        const uploaded = await api<{ data: Profile }>("/me/photo", { method: "POST", form });
        setProfile(uploaded.data);
      }
      const result = await api<{ data: Profile }>("/me/profile", {
        method: "PATCH",
        body: { name: name.trim(), mobile: mobile.trim() },
      });
      setProfile(result.data);
      setName(result.data.name);
      setMobile(result.data.mobile ?? "");
      setPhoto(null);
      setEditing(false);
      setNotice("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your profile");
    } finally {
      setPending(false);
    }
  }

  const shownPhoto = preview || profile?.photoUrl || "";

  return (
    <DriverShell>
      <PageHeader
        title="My profile"
        description="Your name, phone number, and license are loaded from your driver account."
        action={profile && !editing ? (
          <SecondaryButton type="button" onClick={() => { setEditing(true); setNotice(""); setError(""); }}>Edit profile</SecondaryButton>
        ) : null}
      />

      {error ? <div className="mb-4"><Notice tone="danger">{error}</Notice></div> : null}
      {notice ? <div className="mb-4"><Notice tone="ok">{notice}</Notice></div> : null}
      {loading ? <Skeleton className="h-40 rounded-lg" /> : null}

      {profile && !editing ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Panel className="lg:col-span-1">
            <div className="flex flex-col items-start gap-4 sm:flex-row lg:flex-col">
              {shownPhoto ? (
                <img src={shownPhoto} alt="" className="h-20 w-20 rounded-md object-cover" />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-md bg-brand text-lg font-semibold text-white">{initials(profile.name) || "DR"}</span>
              )}
              <div>
                <p className="text-lg font-semibold text-ink">{profile.name}</p>
                <p className="mt-1 text-sm text-muted">{profile.mobile || "Phone not recorded"}</p>
              </div>
            </div>
          </Panel>
          <Panel title="License details" className="lg:col-span-2" extra={<StatusBadge code={profile.licenseStatus.code} label={profile.licenseStatus.label} />}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Driver ID</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{profile.driverId || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Phone number</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{profile.mobile || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">License number</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{profile.licenseNumber || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">License type</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{profile.licenseType.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">License expiry</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{formatDate(profile.licenseExpiry)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      ) : null}

      {profile && editing ? (
        <form onSubmit={save} className="grid items-start gap-4 lg:grid-cols-3">
          <Panel title="Profile photo">
            <div className="flex items-center gap-4">
              {shownPhoto ? (
                <img src={shownPhoto} alt="" className="h-20 w-20 rounded-md object-cover" />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-md bg-brand text-lg font-semibold text-white">{initials(name) || "DR"}</span>
              )}
              <label className="text-sm">
                <span className="mb-1.5 block font-medium">Choose a photo</span>
                <input type="file" accept="image/jpeg,image/png" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
                <span className="mt-1 block text-muted">JPG or PNG, up to 10 MB.</span>
              </label>
            </div>
          </Panel>
          <Panel title="Account" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Driver name</span>
                <TextInput value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Phone number</span>
                <TextInput value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" />
              </label>
            </div>
            <p className="mt-4 text-sm text-muted">Driver ID and license details are kept by your company.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <PrimaryButton disabled={pending}>{pending ? "Saving..." : "Save"}</PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(profile.name);
                  setMobile(profile.mobile ?? "");
                  setPhoto(null);
                  setError("");
                }}
              >
                Cancel
              </SecondaryButton>
            </div>
          </Panel>
        </form>
      ) : null}
    </DriverShell>
  );
}

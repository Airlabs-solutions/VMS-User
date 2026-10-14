"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DriverShell } from "../../../components/DriverShell";
import { Notice, PrimaryButton } from "../../../components/ui";
import { ApiError, api } from "../../../lib/api";
import { formatDate } from "../../../lib/format";
import { loadProfile, rememberProfile, type DriverProfile } from "../../../lib/profile";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"photo" | "verify" | null>(null);

  useEffect(() => {
    if (profile?.verified) router.replace("/my-vehicle");
  }, [profile?.verified, router]);

  useEffect(() => {
    loadProfile(true)
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load your profile"));
  }, []);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPhoto(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("Profile photo must be a JPG or PNG, up to 10 MB.");
      return;
    }
    const local = URL.createObjectURL(file);
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return local;
    });
    setPending("photo");
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api<{ data: Partial<DriverProfile> }>("/me/photo", { method: "POST", form: body });
      setProfile(rememberProfile(result.data));
    } catch (err) {
      if (local.startsWith("blob:")) URL.revokeObjectURL(local);
      setPreview("");
      setError(err instanceof ApiError ? err.message : "Could not upload the photo");
    } finally {
      setPending(null);
    }
  }

  async function verify() {
    setPending("verify");
    setError("");
    try {
      const result = await api<{ data: Partial<DriverProfile> }>("/me/profile/verify", { method: "POST" });
      rememberProfile(result.data);
      router.replace("/my-vehicle");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify your profile");
      setPending(null);
    }
  }

  const photo = preview || profile?.photoUrl || "";
  const completion = profile?.completion ?? 0;
  const missing = (profile?.missing ?? []).filter((item) => item !== "Profile photo" || !photo);

  return (
    <DriverShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium tracking-wide text-brand-deep uppercase">Profile setup</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Complete your profile</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          Your details are shown below. Add a profile photo, then verify to open My Vehicles.
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">{completion}% complete</span>
            <span className="text-muted">Profile photo</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-md bg-brand-soft" aria-hidden="true">
            <div className="h-full rounded-md bg-brand" style={{ width: `${completion}%` }} />
          </div>
        </div>

        {error ? <div className="mt-4"><Notice tone="danger">{error}</Notice></div> : null}
        {!profile && !error ? <p className="mt-6 text-sm text-muted">Loading your details...</p> : null}

        {profile ? (
          <div className="mt-5 space-y-4">
            <section className="rounded-lg border border-line bg-card p-4 shadow-[0_1px_2px_rgba(17,22,16,0.04)] sm:p-5">
              <h2 className="text-sm font-semibold text-ink">Profile photo</h2>
              <p className="mt-1 text-sm text-muted">Upload a JPG or PNG, up to 10 MB.</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                {photo ? (
                  <img src={photo} alt="" className="h-24 w-24 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-24 w-24 place-items-center rounded-lg bg-brand-soft text-sm font-medium text-brand-deep">Photo</span>
                )}
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-line bg-card px-4 text-sm font-medium text-ink hover:border-brand hover:bg-brand-soft">
                  {pending === "photo" ? "Uploading..." : photo ? "Replace photo" : "Upload photo"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={pending !== null}
                    onChange={(event) => {
                      void onPhoto(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-line bg-card p-4 shadow-[0_1px_2px_rgba(17,22,16,0.04)] sm:p-5">
              <h2 className="text-sm font-semibold text-ink">Required details</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Fact label="Full name" value={profile.name || "Not recorded"} />
                <Fact label="Mobile number" value={profile.mobile || "Not recorded"} />
                <Fact label="Iqama number" value={profile.iqamaNumber || "Not recorded"} />
                <Fact label="Iqama expiry" value={formatDate(profile.iqamaExpiry) || "Not recorded"} />
                <Fact label="License number" value={profile.licenseNumber || "Not recorded"} />
                <Fact label="License type" value={profile.licenseType?.label || "Not recorded"} />
                <Fact label="License expiry" value={formatDate(profile.licenseExpiry) || "Not recorded"} />
              </dl>
              {missing.length > 0 ? <p className="mt-4 text-sm text-muted">Still needed: {missing.join(", ")}.</p> : null}
              {profile.complete ? (
                <PrimaryButton className="mt-5" type="button" disabled={pending !== null} onClick={() => void verify()}>
                  {pending === "verify" ? "Verifying..." : "Verify and open My Vehicles"}
                </PrimaryButton>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </DriverShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

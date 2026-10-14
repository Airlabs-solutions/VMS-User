import { api } from "./api";

export type Status = { code: string; label: string };

export type DriverProfile = {
  name: string;
  mobile: string | null;
  driverId: string;
  employeeId: string;
  licenseNumber: string | null;
  licenseType: Status;
  licenseExpiry: string | null;
  licenseStatus: Status;
  iqamaNumber: string | null;
  iqamaExpiry: string | null;
  iqamaStatus: Status;
  photoUrl: string | null;
  completion: number;
  missing: string[];
  complete: boolean;
  verified: boolean;
};

const emptyStatus: Status = { code: "", label: "Not recorded" };

function normalizeProfile(raw: Partial<DriverProfile> | null | undefined): DriverProfile {
  const licenseType = raw?.licenseType?.label ? raw.licenseType : emptyStatus;
  const profile: DriverProfile = {
    name: raw?.name ?? "",
    mobile: raw?.mobile ?? null,
    driverId: raw?.driverId ?? "",
    employeeId: raw?.employeeId ?? "",
    licenseNumber: raw?.licenseNumber ?? null,
    licenseType,
    licenseExpiry: raw?.licenseExpiry ?? null,
    licenseStatus: raw?.licenseStatus?.label ? raw.licenseStatus : emptyStatus,
    iqamaNumber: raw?.iqamaNumber ?? null,
    iqamaExpiry: raw?.iqamaExpiry ?? null,
    iqamaStatus: raw?.iqamaStatus?.label ? raw.iqamaStatus : emptyStatus,
    photoUrl: raw?.photoUrl ?? null,
    completion: 0,
    missing: [],
    complete: false,
    verified: Boolean(raw?.verified),
  };
  const checks: Array<[string, boolean]> = [
    ["Name", Boolean(profile.name.trim())],
    ["Mobile", Boolean(profile.mobile)],
    ["Profile photo", Boolean(profile.photoUrl)],
    ["Iqama number", /^\d{10}$/.test(profile.iqamaNumber ?? "")],
    ["Iqama expiry", Boolean(profile.iqamaExpiry)],
    ["License number", Boolean(profile.licenseNumber?.trim())],
    ["License type", Boolean(profile.licenseType.code)],
    ["License expiry", Boolean(profile.licenseExpiry)],
  ];
  const localMissing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  profile.missing = localMissing;
  profile.completion = Math.round(((checks.length - localMissing.length) / checks.length) * 100);
  profile.complete = localMissing.length === 0 || raw?.complete === true;
  profile.verified = Boolean(raw?.verified) || profile.complete;
  return profile;
}

let cached: DriverProfile | null = null;
let inflight: Promise<DriverProfile> | null = null;

export function loadProfile(force = false) {
  if (!force && cached) return Promise.resolve(cached);
  if (!force && inflight) return inflight;
  inflight = api<{ data: Partial<DriverProfile> }>("/me/profile")
    .then((result) => {
      cached = normalizeProfile(result.data);
      inflight = null;
      return cached;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

export function rememberProfile(profile: Partial<DriverProfile>) {
  cached = normalizeProfile(profile);
  return cached;
}

export function clearProfile() {
  cached = null;
  inflight = null;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )vms_driver_csrf=([^;]*)/) ?? document.cookie.match(/(?:^|; )vms_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { "x-vms-app": "driver" };
  if (method !== "GET") headers["x-csrf-token"] = csrfToken();
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: "include",
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload?.error?.message ?? "Request failed");
  return payload as T;
}

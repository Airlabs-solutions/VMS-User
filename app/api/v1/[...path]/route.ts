import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const apiOrigin = process.env.API_ORIGIN
  ?? (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "https://vms-backend-1rnk.onrender.com");

const forwardedHeaders = ["accept", "content-type", "cookie", "range", "x-csrf-token", "x-vms-app"];
const responseHeaders = ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition"];

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`${apiOrigin}/api/v1/${path.join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: { message: "The server is unavailable. Try again." } }, { status: 502 });
  }

  const outgoing = new Headers();
  for (const name of responseHeaders) {
    const value = upstream.headers.get(name);
    if (value) outgoing.set(name, value);
  }
  if (!outgoing.has("content-type")) outgoing.set("content-type", "application/json");
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: outgoing,
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

import type { NextRequest } from "next/server";

/**
 * Origin safe for browser redirects. Avoids 0.0.0.0 (bind address, not reachable
 * in the browser) and prefers proxy headers in production.
 */
export function getBrowserOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim();
  if (host && !host.startsWith("0.0.0.0")) {
    const proto = request.nextUrl.protocol.replace(":", "") || "http";
    return `${proto}://${host}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  const port = request.nextUrl.port || process.env.PORT || "8080";
  return `http://localhost:${port}`;
}

export function browserRedirectUrl(
  request: NextRequest,
  pathname: string,
  searchParams?: Record<string, string>,
): URL {
  const url = new URL(pathname, getBrowserOrigin(request));
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

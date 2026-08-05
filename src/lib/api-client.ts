/**
 * Tiny typed fetch wrapper for the client. Hooks use this to talk to the
 * server route handlers; the server (routes -> services -> repositories) is the
 * only tier that touches Google Sheets, so credentials never reach the client.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<never> {
  let message = `Error ${res.status}`;
  let details: unknown;
  try {
    const body = await res.json();
    message = body?.error ?? message;
    details = body?.issues;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, message, details);
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

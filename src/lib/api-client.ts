/**
 * Tiny typed fetch wrapper for the client. Hooks use this to talk to the
 * server route handlers; the server (routes -> services -> repositories) is the
 * only tier that touches the database, so credentials never reach the client.
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

async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 15_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) await parseError(res);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "La solicitud tardó demasiado. Intenta de nuevo.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  return fetchJson<T>(url, { headers: { Accept: "application/json" } });
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(url: string): Promise<T> {
  return fetchJson<T>(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
}

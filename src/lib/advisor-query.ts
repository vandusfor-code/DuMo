/**
 * Fetch del área asesora.
 *
 * IMPORTANTE: antes devolvía un fallback vacío ante cualquier error, así que un
 * 401/500/timeout se veía como "conversación sin mensajes" — una falla
 * invisible en la función más crítica del CRM. Ahora lanza el error: React
 * Query conserva los últimos datos buenos y la UI puede avisar y reintentar.
 *
 * Solo cookie httpOnly — no Authorization: Bearer (evita token stale en localStorage).
 */

export class AdvisorFetchError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "AdvisorFetchError";
  }
}

/**
 * REGLA: la sesión SOLO se cierra cuando el usuario pulsa "Cerrar sesión".
 * Nunca redirigimos al login desde aquí — un 401/403 puntual (o un fallo
 * transitorio) no debe sacar a nadie de la aplicación. Se avisa, se reintenta
 * y se conservan los últimos datos buenos.
 */
export async function advisorApiGet<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: "include",
      // Solo cookie httpOnly — nunca Authorization: Bearer en asesora.
      // Un token viejo en localStorage (p. ej. sesión admin) podía mandar otro
      // userId/rol y mostrar la bandeja completa del CRM.
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      // El código va en el mensaje: así se sabe de inmediato qué falló.
      // NUNCA se redirige al login desde aquí.
      throw new AdvisorFetchError(
        `No se pudo cargar (error ${res.status}). Reintentando…`,
        res.status,
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AdvisorFetchError) throw err;
    throw new AdvisorFetchError(
      err instanceof Error && err.name === "AbortError"
        ? "La conexión tardó demasiado. Reintentando…"
        : "Sin conexión con el servidor. Reintentando…",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Opciones comunes de React Query para pantallas de asesora. */
export const ADVISOR_QUERY_OPTIONS = {
  retry: 2,
  refetchOnWindowFocus: true,
  staleTime: 20_000,
} as const;

async function advisorFetch<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      credentials: "include",
      headers: { ...(rest.headers as Record<string, string>) },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      // El backend a veces manda un mensaje específico y accionable (ej. folio
      // faltante/duplicado) en el body — sin esto, el usuario solo veía
      // "error 422" genérico y no sabía qué corregir.
      let message = `No se pudo completar (error ${res.status}). Reintentando…`;
      try {
        const body = await res.json();
        if (body && typeof body.error === "string" && body.error.trim()) {
          message = body.error;
        }
      } catch {
        // body no era JSON legible — se mantiene el mensaje genérico.
      }
      throw new AdvisorFetchError(message, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AdvisorFetchError) throw err;
    throw new AdvisorFetchError(
      err instanceof Error && err.name === "AbortError"
        ? "La conexión tardó demasiado. Reintentando…"
        : "Sin conexión con el servidor. Reintentando…",
    );
  } finally {
    clearTimeout(timer);
  }
}

export function advisorApiPost<T>(url: string, body: unknown, timeoutMs = 15_000): Promise<T> {
  return advisorFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    timeoutMs,
  });
}

export function advisorApiPostForm<T>(url: string, form: FormData, timeoutMs = 60_000): Promise<T> {
  return advisorFetch<T>(url, {
    method: "POST",
    body: form,
    timeoutMs,
    headers: { Accept: "application/json" },
  });
}

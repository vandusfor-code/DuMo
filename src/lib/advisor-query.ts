/**
 * Fetch del área asesora.
 *
 * IMPORTANTE: antes devolvía un fallback vacío ante cualquier error, así que un
 * 401/500/timeout se veía como "conversación sin mensajes" — una falla
 * invisible en la función más crítica del CRM. Ahora lanza el error: React
 * Query conserva los últimos datos buenos y la UI puede avisar y reintentar.
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

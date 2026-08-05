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

/** Evita disparar varias redirecciones al login a la vez. */
let redirectingToLogin = false;

/**
 * Sesión caída: la página no navega sola (solo fallan las peticiones), así que
 * el usuario veía "no se pudo sincronizar" sin entender nada. Se autorrepara
 * mandándolo al login para que vuelva a entrar.
 */
function handleExpiredSession() {
  if (typeof window === "undefined" || redirectingToLogin) return;
  redirectingToLogin = true;
  const next = window.location.pathname + window.location.search;
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

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
      if (res.status === 401 || res.status === 403) {
        handleExpiredSession();
        throw new AdvisorFetchError(
          "Tu sesión expiró. Redirigiendo al inicio de sesión…",
          res.status,
        );
      }
      // El código va en el mensaje: así se sabe de inmediato qué falló.
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

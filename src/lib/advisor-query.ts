/**
 * Fetch para el área asesora: nunca lanza error; devuelve fallback si algo falla.
 */
export async function advisorApiGet<T>(
  url: string,
  fallback: T,
  timeoutMs = 25_000,
): Promise<T> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Opciones comunes de React Query para pantallas de asesora. */
export const ADVISOR_QUERY_OPTIONS = {
  retry: false,
  refetchOnWindowFocus: true,
  staleTime: 20_000,
} as const;

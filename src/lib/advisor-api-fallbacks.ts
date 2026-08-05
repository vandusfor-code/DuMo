import "server-only";

/** Ejecuta un handler con timeout; en error devuelve fallback (GET siempre 200). */
export async function withAdvisorFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string,
  timeoutMs = 25_000,
): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs),
      ),
    ]);
  } catch (error) {
    console.error(`[advisor-api] ${label}`, error);
    return fallback;
  }
}

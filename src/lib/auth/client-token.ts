/**
 * Respaldo de sesión para peticiones fetch (Authorization: Bearer).
 *
 * La cookie httpOnly es el mecanismo principal en navegación y recargas.
 * localStorage solo complementa fetch cuando hace falta — NUNCA escribimos
 * otra cookie `dumo_session` desde JS: chocaba con la httpOnly del servidor
 * y provocaba cierres de sesión al recargar o cambiar de pantalla.
 */
const KEY = "dumo_token";

export function saveClientToken(token: string | undefined | null) {
  if (typeof window === "undefined" || !token) return;
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function getClientToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearClientToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Cabecera de autorización si hay token de respaldo guardado. */
export function authHeader(): Record<string, string> {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

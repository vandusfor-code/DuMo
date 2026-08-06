/**
 * Respaldo de sesión para navegadores que no guardan la cookie.
 *
 * La cookie httpOnly sigue siendo el mecanismo principal; esto solo entra en
 * juego cuando el navegador la bloquea (extensiones, bloqueo de cookies,
 * modos restringidos). El token es el mismo que firma el servidor.
 */
const KEY = "dumo_token";

export function saveClientToken(token: string | undefined | null) {
  if (typeof window === "undefined" || !token) return;
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    /* almacenamiento no disponible */
  }
  // También se escribe como cookie desde el navegador: al recargar la página
  // no se envían cabeceras, así que sin esto una recarga volvería al login.
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `dumo_session=${token}; path=/; max-age=604800; SameSite=Lax${secure}`;
  } catch {
    /* cookies bloqueadas: queda el respaldo por cabecera */
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
  try {
    document.cookie = "dumo_session=; path=/; max-age=0";
  } catch {
    /* nada que limpiar */
  }
}

/** Cabecera de autorización si hay token de respaldo guardado. */
export function authHeader(): Record<string, string> {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

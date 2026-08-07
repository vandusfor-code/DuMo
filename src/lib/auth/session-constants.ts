/** Duración de sesión: 10 años. Solo termina con Cerrar sesión o desactivación admin. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 10;

/** Renovar el JWT cuando falten menos de 30 días para expirar (ventana deslizante). */
export const SESSION_RENEW_BEFORE_SEC = 60 * 60 * 24 * 30;

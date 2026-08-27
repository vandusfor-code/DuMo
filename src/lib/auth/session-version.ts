import type { SessionPayload } from "@/lib/auth/session-cookie";

/** Versión embebida en el JWT; tokens legacy sin campo cuentan como 0. */
export function tokenVersionFromPayload(payload: SessionPayload): number {
  return typeof payload.tokenVersion === "number" && Number.isFinite(payload.tokenVersion)
    ? payload.tokenVersion
    : 0;
}

/** true cuando la DB invalidó sesiones posteriores al JWT emitido. */
export function isSessionRevoked(payload: SessionPayload, dbTokenVersion: number): boolean {
  return dbTokenVersion > tokenVersionFromPayload(payload);
}

/**
 * Respaldo JWT solo para tokens emitidos antes de tokenVersion explícito.
 * Tokens con `tokenVersion` definido requieren DB para validar revocación.
 */
export function allowsJwtFallback(payload: SessionPayload): boolean {
  return payload.tokenVersion === undefined;
}

export class SessionRevokedError extends Error {
  constructor(message = "Sesión revocada.") {
    super(message);
    this.name = "SessionRevokedError";
  }
}

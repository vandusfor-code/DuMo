import "server-only";
import {
  allowsJwtFallback,
  isSessionRevoked,
  SessionRevokedError,
  tokenVersionFromPayload,
} from "@/lib/auth/session-version";
import type { SessionPayload } from "@/lib/auth/session-cookie";
import type { AuthUser } from "@/types/auth";

export { SessionRevokedError };

/** Valida usuario de DB contra el JWT; lanza si la sesión fue revocada. */
export function assertSessionNotRevoked(payload: SessionPayload, user: AuthUser): void {
  const dbVersion = user.tokenVersion ?? 0;
  if (isSessionRevoked(payload, dbVersion)) {
    throw new SessionRevokedError();
  }
}

export function canUseJwtFallback(payload: SessionPayload): boolean {
  return allowsJwtFallback(payload);
}

export function describeSessionVersion(payload: SessionPayload, dbTokenVersion: number): string {
  return `jwt=${tokenVersionFromPayload(payload)} db=${dbTokenVersion}`;
}

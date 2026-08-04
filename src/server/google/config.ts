import "server-only";

/**
 * Server-only Google credentials, read from environment variables.
 *
 * On Vercel the private key is stored as a single line with literal "\n"
 * sequences (and sometimes wrapped in quotes). We normalise it back into a
 * real PEM here so the JWT signer accepts it.
 */

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  // Strip accidental surrounding quotes (common when pasted into dashboards).
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

export interface GoogleConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  sheetId: string;
}

/**
 * Returns the fully-formed config, or `null` when any required variable is
 * absent. A `null` result triggers the automatic mock fallback in dev.
 */
export function getGoogleConfig(): GoogleConfig | null {
  const projectId = process.env.GOOGLE_PROJECT_ID?.trim();
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();

  if (!projectId || !clientEmail || !privateKey || !sheetId) {
    return null;
  }

  return { projectId, clientEmail, privateKey, sheetId };
}

/** True when all Google credentials are present. */
export function hasGoogleCredentials(): boolean {
  return getGoogleConfig() !== null;
}

import "server-only";
import crypto from "node:crypto";
import { getConfig, setConfig } from "@/server/db/app-config";

export const INSTAGRAM_CONFIG_KEY = "instagram_integration";

export type InstagramIntegrationConfig = {
  igUserId: string;
  accessToken: string;
  username?: string;
  updatedAt?: string;
};

function safeEqualVerifyToken(received: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(received).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Tokens válidos para el handshake GET del webhook de Instagram. Acepta un
 * token propio (INSTAGRAM_VERIFY_TOKEN) o, para no obligar a crear una
 * variable nueva, cualquiera de los que ya usa Messenger/WhatsApp — así se
 * puede reusar el mismo valor ya configurado en Meta si se prefiere.
 */
export function instagramWebhookVerifyTokens(): string[] {
  const tokens = new Set<string>();
  for (const key of ["INSTAGRAM_VERIFY_TOKEN", "MESSENGER_VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN"] as const) {
    const value = process.env[key]?.trim();
    if (value) tokens.add(value);
  }
  return [...tokens];
}

export function matchesInstagramWebhookVerifyToken(received: string | null): boolean {
  if (!received) return false;
  return instagramWebhookVerifyTokens().some((expected) => safeEqualVerifyToken(received, expected));
}

/** Token principal para mostrar en Admin. */
export function instagramVerifyToken(): string {
  return (
    process.env.INSTAGRAM_VERIFY_TOKEN?.trim() ||
    process.env.MESSENGER_VERIFY_TOKEN?.trim() ||
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
    ""
  );
}

export async function getInstagramIntegrationConfig(): Promise<InstagramIntegrationConfig | null> {
  const fromDb = await getConfig<InstagramIntegrationConfig | null>(INSTAGRAM_CONFIG_KEY, null);
  const igUserId = fromDb?.igUserId?.trim() || process.env.INSTAGRAM_USER_ID?.trim() || "";
  const accessToken = fromDb?.accessToken?.trim() || process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || "";

  if (!igUserId || !accessToken) return null;

  return {
    igUserId,
    accessToken,
    username: fromDb?.username,
    updatedAt: fromDb?.updatedAt,
  };
}

export async function saveInstagramIntegrationConfig(input: {
  igUserId: string;
  accessToken: string;
  username?: string;
}): Promise<void> {
  const igUserId = input.igUserId.trim();
  const accessToken = input.accessToken.trim();
  if (!igUserId || !accessToken) {
    throw new Error("IG User ID y Access Token son obligatorios.");
  }

  await setConfig<InstagramIntegrationConfig>(INSTAGRAM_CONFIG_KEY, {
    igUserId,
    accessToken,
    username: input.username?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function allowedInstagramUserIds(): string[] {
  return (process.env.INSTAGRAM_USER_ID ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

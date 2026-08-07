import "server-only";
import crypto from "node:crypto";
import { getConfig, setConfig } from "@/server/db/app-config";

export const MESSENGER_CONFIG_KEY = "messenger_integration";

export type MessengerIntegrationConfig = {
  pageId: string;
  pageAccessToken: string;
  pageName?: string;
  updatedAt?: string;
};

function safeEqualVerifyToken(received: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(received).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Tokens válidos para el handshake GET de Meta (Messenger y/o WhatsApp directo). */
export function webhookVerifyTokens(): string[] {
  const tokens = new Set<string>();
  for (const key of ["MESSENGER_VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN"] as const) {
    const value = process.env[key]?.trim();
    if (value) tokens.add(value);
  }
  return [...tokens];
}

export function matchesWebhookVerifyToken(received: string | null): boolean {
  if (!received) return false;
  return webhookVerifyTokens().some((expected) => safeEqualVerifyToken(received, expected));
}

/** Token principal para mostrar en Admin (Messenger primero, fallback WhatsApp). */
export function messengerVerifyToken(): string {
  return (
    process.env.MESSENGER_VERIFY_TOKEN?.trim() ||
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
    ""
  );
}

export async function getMessengerIntegrationConfig(): Promise<MessengerIntegrationConfig | null> {
  const fromDb = await getConfig<MessengerIntegrationConfig | null>(MESSENGER_CONFIG_KEY, null);
  const pageId = fromDb?.pageId?.trim() || process.env.MESSENGER_PAGE_ID?.trim() || "";
  const pageAccessToken =
    fromDb?.pageAccessToken?.trim() || process.env.MESSENGER_PAGE_ACCESS_TOKEN?.trim() || "";

  if (!pageId || !pageAccessToken) return null;

  return {
    pageId,
    pageAccessToken,
    pageName: fromDb?.pageName,
    updatedAt: fromDb?.updatedAt,
  };
}

export async function saveMessengerIntegrationConfig(input: {
  pageId: string;
  pageAccessToken: string;
  pageName?: string;
}): Promise<void> {
  const pageId = input.pageId.trim();
  const pageAccessToken = input.pageAccessToken.trim();
  if (!pageId || !pageAccessToken) {
    throw new Error("Page ID y Page Access Token son obligatorios.");
  }

  await setConfig<MessengerIntegrationConfig>(MESSENGER_CONFIG_KEY, {
    pageId,
    pageAccessToken,
    pageName: input.pageName?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function allowedMessengerPageIds(): string[] {
  const fromEnv = (process.env.MESSENGER_PAGE_ID ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv;
}

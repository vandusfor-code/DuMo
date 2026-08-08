import "server-only";

/** Acepta host sin protocolo (error común en Vercel): dumo-production.up.railway.app */
export function normalizeBridgeUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}

export function webQrBridgeUrl(): string | null {
  return normalizeBridgeUrl(process.env.WEB_QR_BRIDGE_URL);
}

export function webQrBridgeSecret(): string | null {
  return process.env.WEB_QR_BRIDGE_SECRET?.trim() || null;
}

export function webQrWebhookSecret(): string | null {
  return process.env.WEB_QR_WEBHOOK_SECRET?.trim() || null;
}

export function webQrConfigured(): boolean {
  return Boolean(webQrBridgeUrl() && webQrBridgeSecret() && webQrWebhookSecret());
}

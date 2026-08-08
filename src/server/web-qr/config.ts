import "server-only";

export function webQrBridgeUrl(): string | null {
  const url = process.env.WEB_QR_BRIDGE_URL?.trim();
  return url || null;
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

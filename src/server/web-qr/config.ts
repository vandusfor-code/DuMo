import "server-only";

/** Acepta host sin protocolo o con /health pegado por error en Vercel. */
export function normalizeBridgeUrl(raw: string | null | undefined): string | null {
  let trimmed = raw?.trim();
  if (!trimmed) return null;

  trimmed = trimmed.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const u = new URL(trimmed);
    // El bridge expone /health, /sessions en la raíz — no bajo /health/*
    if (u.pathname && u.pathname !== "/") {
      u.pathname = "/";
    }
    return u.origin;
  } catch {
    return trimmed.replace(/\/health\/?$/i, "").replace(/\/$/, "");
  }
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

import "server-only";
import { webQrBridgeSecret, webQrBridgeUrl } from "@/server/web-qr/config";
import type { BridgeInboundPayload, BridgeSessionStatus } from "@/server/web-qr/types";

async function bridgeFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = webQrBridgeUrl();
  const secret = webQrBridgeSecret();
  if (!base || !secret) {
    throw new Error(
      "Módulo QR no configurado. Define WEB_QR_BRIDGE_URL y WEB_QR_BRIDGE_SECRET en Vercel.",
    );
  }

  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Web-Qr-Bridge-Secret": secret,
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bridge QR respondió ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  return (await res.json()) as T;
}

export async function bridgeCreateSession(input: {
  channelId: string;
  label: string;
  webhookUrl: string;
  webhookSecret: string;
}): Promise<{ sessionId: string }> {
  return bridgeFetch("/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function bridgeGetSessionStatus(sessionId: string): Promise<BridgeSessionStatus> {
  return bridgeFetch(`/sessions/${encodeURIComponent(sessionId)}`);
}

/** null si el bridge reinició y perdió la sesión en memoria. */
export async function bridgeGetSessionStatusOrNull(
  sessionId: string,
): Promise<BridgeSessionStatus | null> {
  const base = webQrBridgeUrl();
  const secret = webQrBridgeSecret();
  if (!base || !secret) return null;

  const res = await fetch(`${base.replace(/\/$/, "")}/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Accept: "application/json",
      "X-Web-Qr-Bridge-Secret": secret,
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bridge QR respondió ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as BridgeSessionStatus;
}

export async function bridgeDisconnectSession(sessionId: string): Promise<void> {
  await bridgeFetch(`/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export async function bridgeSendText(input: {
  channelId: string;
  to?: string;
  jid?: string;
  text: string;
}): Promise<{ id: string; jid?: string }> {
  return bridgeFetch("/send", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function bridgeSendMedia(input: {
  channelId: string;
  to?: string;
  jid?: string;
  mediaUrl: string;
  mimeType?: string;
  caption?: string;
}): Promise<{ id: string; jid?: string }> {
  return bridgeFetch("/send-media", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Prueba el webhook Railway → Vercel con el secreto de la sesión activa. */
export async function bridgeTestWebhook(channelId: string): Promise<{
  ok: boolean;
  lastWebhookStatus?: number;
  lastWebhookError?: string | null;
  webhookConfigured?: boolean;
}> {
  return bridgeFetch("/test-webhook", {
    method: "POST",
    body: JSON.stringify({ channelId }),
  });
}

export type { BridgeInboundPayload };

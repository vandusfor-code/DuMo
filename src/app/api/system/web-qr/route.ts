import { NextResponse } from "next/server";
import {
  webQrBridgeSecret,
  webQrBridgeUrl,
  webQrConfigured,
  webQrWebhookSecret,
} from "@/server/web-qr/config";
import { bridgeTestWebhook } from "@/server/web-qr/bridge-client";
import { reconcileWebQrBridgeSessions } from "@/server/web-qr/ensure-session";
import { verifyWebQrWebhookReachable } from "@/server/web-qr/verify-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskHost(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.hostname;
  } catch {
    return "(URL inválida)";
  }
}

/** Diagnóstico del módulo QR — no expone secretos. */
export async function GET() {
  const bridgeUrl = webQrBridgeUrl();
  const configured = webQrConfigured();

  async function fetchBridgeHealth() {
    if (!bridgeUrl || !webQrBridgeSecret()) return null;
    try {
      const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      return {
        ok: res.ok && typeof body === "object" && body !== null && (body as { ok?: boolean }).ok === true,
        status: res.status,
        body,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  let health = await fetchBridgeHealth();
  let reconcileAttempted = false;

  const sessionCount =
    health?.body && typeof health.body === "object"
      ? Number((health.body as { sessions?: number }).sessions ?? 0)
      : 0;
  const persistedSessions =
    health?.body && typeof health.body === "object"
      ? Number((health.body as { persistedSessions?: number }).persistedSessions ?? 0)
      : 0;

  if (configured && health?.ok && sessionCount === 0) {
    reconcileAttempted = true;
    const registered = await reconcileWebQrBridgeSessions();
    if (registered > 0) {
      await new Promise((r) => setTimeout(r, 4000));
      health = await fetchBridgeHealth();
    }
  }

  const rawBridgeUrl = process.env.WEB_QR_BRIDGE_URL?.trim() ?? null;
  const host = maskHost(bridgeUrl);
  const problems: string[] = [];

  if (!configured) {
    problems.push("Faltan WEB_QR_BRIDGE_URL, WEB_QR_BRIDGE_SECRET o WEB_QR_WEBHOOK_SECRET en Vercel.");
  }
  if (rawBridgeUrl && !/^https?:\/\//i.test(rawBridgeUrl)) {
    problems.push(
      `WEB_QR_BRIDGE_URL="${rawBridgeUrl}" no incluye https:// — DuMo lo corrige en código; mejor pon https:// explícito.`,
    );
  }
  if (rawBridgeUrl?.includes("/health")) {
    problems.push(
      'WEB_QR_BRIDGE_URL no debe terminar en /health — usa solo la raíz: https://dumo-production.up.railway.app',
    );
  }
  if (host === "railway.app" || host === "www.railway.app") {
    problems.push(
      'WEB_QR_BRIDGE_URL apunta a railway.app (el panel web). Debe ser tu dominio generado, p. ej. "dumo-web-qr-bridge-production.up.railway.app".',
    );
  }
  if (configured && health && !health.ok) {
    problems.push("DuMo no pudo obtener /health del bridge — revisa la URL y que Railway esté desplegado.");
  }

  const webhookReachable = configured ? await verifyWebQrWebhookReachable() : null;
  if (webhookReachable && !webhookReachable.ok) {
    problems.push(
      `Webhook QR no responde OK (${webhookReachable.status ?? "?"}): ${webhookReachable.error ?? "secreto incorrecto"}. WEB_QR_WEBHOOK_SECRET (Vercel) debe ser idéntico a DUMO_WEBHOOK_SECRET (Railway).`,
    );
  }

  let bridgeWebhookTest: {
    ok: boolean;
    lastWebhookStatus?: number;
    lastWebhookError?: string | null;
    webhookConfigured?: boolean;
  } | null = null;

  const activeChannelId =
    health?.body &&
    typeof health.body === "object" &&
    Array.isArray((health.body as { active?: unknown[] }).active)
      ? ((health.body as { active: { channelId?: string; status?: string }[] }).active.find(
          (s) => s.status === "CONNECTED",
        )?.channelId ?? null)
      : null;

  const hasConnectedSession = Boolean(activeChannelId);

  const latestPersistedSessions =
    health?.body && typeof health.body === "object"
      ? Number((health.body as { persistedSessions?: number }).persistedSessions ?? 0)
      : persistedSessions;

  if (configured && health?.ok && !hasConnectedSession) {
    if (latestPersistedSessions === 0) {
      problems.push(
        "Bridge sin credenciales en disco — Railway perdió la sesión. Ve a /admin/web-qr y escanea el QR de nuevo.",
      );
    } else if (reconcileAttempted) {
      problems.push(
        "Bridge reconectando sesión desde disco — espera 10–20 s y recarga. Si pide QR, escanéalo en /admin/web-qr.",
      );
    } else {
      problems.push(
        "Bridge sin sesión activa (reinicio reciente). Abre /admin/web-qr o recarga este diagnóstico.",
      );
    }
  }

  if (configured && activeChannelId) {
    try {
      bridgeWebhookTest = await bridgeTestWebhook(activeChannelId);
      if (!bridgeWebhookTest.ok) {
        problems.push(
          `Bridge → DuMo webhook falló (HTTP ${bridgeWebhookTest.lastWebhookStatus ?? "?"}): ${bridgeWebhookTest.lastWebhookError ?? "revisa DUMO_WEBHOOK_SECRET en Railway"}.`,
        );
      }
    } catch (err) {
      bridgeWebhookTest = {
        ok: false,
        lastWebhookError: err instanceof Error ? err.message : String(err),
      };
      problems.push("No se pudo probar webhook desde el bridge.");
    }
  }

  const bridgeLastError =
    health?.body &&
    typeof health.body === "object" &&
    Array.isArray((health.body as { active?: unknown[] }).active)
      ? ((health.body as { active: { lastWebhookError?: string | null; lastWebhookStatus?: number | null }[] })
          .active.find((s) => s.lastWebhookStatus && s.lastWebhookStatus >= 400)?.lastWebhookError ?? null)
      : null;
  if (bridgeLastError?.includes("wa_chat_jid")) {
    problems.push(
      "Mensajes QR fallan al guardar: falta columna wa_chat_jid en la BD. Tras el deploy, abre /api/system/db una vez para aplicar la migración.",
    );
  }

  return NextResponse.json({
    configured,
    bridgeHost: host,
    webhookSecretSet: Boolean(webQrWebhookSecret()),
    bridgeSecretSet: Boolean(webQrBridgeSecret()),
    health,
    webhookReachable,
    bridgeWebhookTest,
    reconcileAttempted,
    readyForQr:
      configured &&
      health?.ok === true &&
      webhookReachable?.ok === true &&
      hasConnectedSession &&
      (bridgeWebhookTest?.ok ?? false),
    problems,
    hint: "Admin UI: /admin/web-qr (solo administrador).",
  });
}

import { NextResponse } from "next/server";
import {
  webQrBridgeSecret,
  webQrBridgeUrl,
  webQrConfigured,
  webQrWebhookSecret,
} from "@/server/web-qr/config";

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

  let health: { ok: boolean; status?: number; body?: unknown; error?: string } | null = null;

  if (bridgeUrl && webQrBridgeSecret()) {
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
      health = {
        ok: res.ok && typeof body === "object" && body !== null && (body as { ok?: boolean }).ok === true,
        status: res.status,
        body,
      };
    } catch (err) {
      health = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
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

  return NextResponse.json({
    configured,
    bridgeHost: host,
    webhookSecretSet: Boolean(webQrWebhookSecret()),
    bridgeSecretSet: Boolean(webQrBridgeSecret()),
    health,
    readyForQr: configured && health?.ok === true,
    problems,
    hint: "Admin UI: /admin/web-qr (solo administrador).",
  });
}

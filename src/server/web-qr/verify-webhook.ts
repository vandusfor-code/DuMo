import "server-only";
import { webQrWebhookSecret } from "@/server/web-qr/config";

/** Comprueba que Vercel acepta el mismo secreto que se envía al bridge. */
export async function verifyWebQrWebhookReachable(): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  const secret = webQrWebhookSecret()?.trim();
  if (!secret) {
    return { ok: false, error: "WEB_QR_WEBHOOK_SECRET no configurado en Vercel." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
  const url = `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Web-Qr-Webhook-Secret": secret,
      },
      body: JSON.stringify({ type: "ping" }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: detail.slice(0, 200) || `HTTP ${res.status}`,
      };
    }

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

#!/usr/bin/env node
/**
 * Smoke tests en preview (vía vercel curl) — WABA webhook + QR webhook.
 * Uso: node --env-file=.env.vercel.production scripts/preview-smoke-test.mjs
 */

import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const PREVIEW =
  process.env.PREVIEW_URL?.trim() ||
  "https://du-7gjt3km6s-vandusfor-4970s-projects.vercel.app";

const qrSecret = process.env.WEB_QR_WEBHOOK_SECRET?.trim();
const forwardSecret = process.env.WHATSAPP_FORWARD_SECRET?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function vercelCurl(method, path, headers = {}, body = null) {
  const args = ["vercel", "curl", "-X", method, path, "--deployment", PREVIEW, "--json"];
  for (const [k, v] of Object.entries(headers)) {
    args.push("-H", `${k}: ${v}`);
  }
  if (body != null) {
    args.push("-d", JSON.stringify(body));
  }
  const out = execSync(`npx ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const parsed = JSON.parse(out.trim());
  return typeof parsed.response === "string" ? JSON.parse(parsed.response) : parsed.response ?? parsed;
}

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
}

async function countMessages(conversationId) {
  if (!supabaseUrl || !serviceKey) return null;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { count } = await supabase
    .from("lead_messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  return count ?? 0;
}

// 1. Bandeja / DB
try {
  const db = vercelCurl("GET", "/api/system/db");
  record(
    "Preview bandeja (adminListTest)",
    db.adminListTest?.ok === true && db.conversations >= 63,
    `${db.conversations} conv, ${db.messages} msgs, poolerWarnings=${JSON.stringify(db.poolerWarnings)}`,
  );
} catch (e) {
  record("Preview bandeja", false, e instanceof Error ? e.message : String(e));
}

// 2. WABA config
try {
  const wa = vercelCurl("GET", "/api/system/whatsapp");
  record(
    "WABA credenciales Meta",
    wa.ok === true && wa.canSend === true,
    wa.meta?.displayPhone ?? wa.configError ?? "unknown",
  );
} catch (e) {
  record("WABA credenciales", false, e instanceof Error ? e.message : String(e));
}

// 3. WABA inbound (simulado vía forward secret)
const testWaPhone = `5699${String(Date.now()).slice(-7)}`;
const testWaMsgId = `wamid.smoke-${Date.now()}`;
if (forwardSecret) {
  try {
    const before = await countMessages(testWaPhone);
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "1058034444062074" },
                contacts: [{ profile: { name: "Smoke Test" }, wa_id: testWaPhone }],
                messages: [
                  {
                    from: testWaPhone,
                    id: testWaMsgId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: `[SMOKE] inbound ${new Date().toISOString()}` },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const res = vercelCurl("POST", "/api/whatsapp/webhook", {
      "Content-Type": "application/json",
      "x-dumo-forward-secret": forwardSecret,
    }, payload);
    await new Promise((r) => setTimeout(r, 2000));
    const after = await countMessages(testWaPhone);
    record(
      "WABA inbound simulado",
      res?.ok !== false && after !== null && after > (before ?? 0),
      `msgs ${before}→${after}, waId=${testWaPhone}`,
    );
  } catch (e) {
    record("WABA inbound simulado", false, e instanceof Error ? e.message : String(e));
  }
} else {
  record("WABA inbound simulado", false, "WHATSAPP_FORWARD_SECRET no disponible localmente (encriptada en Vercel)");
}

// 4. QR webhook ping
if (qrSecret) {
  try {
    const ping = vercelCurl("POST", "/api/web-qr/webhook", {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": qrSecret,
    }, { type: "ping" });
    record("QR webhook ping", ping?.ok === true && ping?.pong === true, JSON.stringify(ping));
  } catch (e) {
    record("QR webhook ping", false, e instanceof Error ? e.message : String(e));
  }

  // 5. QR inbound simulado
  const testQrPhone = `57300${String(Date.now()).slice(-7)}`;
  const testChannelId = "webqr-smoke-test-channel";
  try {
    const before = await countMessages(testQrPhone);
    const inbound = vercelCurl("POST", "/api/web-qr/webhook", {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": qrSecret,
    }, {
      type: "message.inbound",
      payload: {
        channelId: testChannelId,
        from: testQrPhone,
        senderJid: `${testQrPhone}@s.whatsapp.net`,
        messageId: `qr-smoke-${Date.now()}`,
        timestamp: Date.now(),
        type: "text",
        text: `[SMOKE QR] inbound ${new Date().toISOString()}`,
        customerName: "Smoke QR",
      },
    });
    await new Promise((r) => setTimeout(r, 2000));
    const after = await countMessages(testQrPhone);
    record(
      "QR inbound simulado (webhook persist)",
      inbound?.ok === true && after !== null && after > (before ?? 0),
      `msgs ${before}→${after}, phone=${testQrPhone}`,
    );
  } catch (e) {
    record("QR inbound simulado", false, e instanceof Error ? e.message : String(e));
  }
} else {
  record("QR webhook", false, "WEB_QR_WEBHOOK_SECRET no disponible");
}

// 6. QR bridge health
try {
  const qr = vercelCurl("GET", "/api/system/web-qr");
  record(
    "QR bridge health",
    qr.configured === true && qr.health?.ok === true,
    qr.readyForQr ? "sesión CONNECTED" : (qr.problems?.[0] ?? "sin sesión activa"),
  );
} catch (e) {
  record("QR bridge health", false, e instanceof Error ? e.message : String(e));
}

console.log("\n=== RESUMEN ===");
console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
process.exit(failed > 0 ? 1 : 0);

/**
 * Prueba E2E del flujo de imágenes (recepción simulada + storage + DB + consulta).
 * Ejecutar: node --env-file=.env.production.local node_modules/tsx/dist/cli.mjs scripts/e2e-image-chat.ts
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) process.env[key] = val;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.production.local"));

import crypto from "node:crypto";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3003";
const FORWARD_SECRET = process.env.WHATSAPP_FORWARD_SECRET?.trim() ?? "";
const META_APP_SECRET = process.env.META_APP_SECRET?.trim() ?? "";

function dbUrl(): string {
  return (
    process.env.DATABASE_URL1 ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    ""
  ).trim();
}

function pngBuffer(): Buffer {
  // 1x1 PNG rojo
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

async function main() {
  const results: string[] = [];
  const fail = (msg: string) => {
    results.push(`FAIL: ${msg}`);
    console.error("FAIL:", msg);
  };
  const ok = (msg: string) => {
    results.push(`OK: ${msg}`);
    console.log("OK:", msg);
  };

  if (!FORWARD_SECRET && !META_APP_SECRET) {
    fail("Falta WHATSAPP_FORWARD_SECRET o META_APP_SECRET");
    process.exit(1);
  }
  const url = dbUrl();
  if (!url) {
    fail("DATABASE_URL1 no configurado");
    process.exit(1);
  }

  const sql = postgres(url, { ssl: "require", prepare: false, max: 1 });
  const testWaId = `5699${String(Date.now()).slice(-8)}`;
  const waMessageId = `wamid.e2e-${Date.now()}`;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "test-phone-id";

  // Simular webhook con imagen: Meta no procesará media id falso, pero probamos el path de error
  // Para prueba real de storage usamos send path vía servicio directo si hay token

  const webhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: "E2E Test" }, wa_id: testWaId }],
              messages: [
                {
                  from: testWaId,
                  id: waMessageId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "image",
                  image: {
                    id: "fake-media-id-e2e",
                    mime_type: "image/png",
                    caption: "Prueba E2E",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(webhookPayload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (FORWARD_SECRET) {
    headers["X-DuMo-Forward-Secret"] = FORWARD_SECRET;
  } else if (META_APP_SECRET) {
    headers["X-Hub-Signature-256"] =
      "sha256=" + crypto.createHmac("sha256", META_APP_SECRET).update(body).digest("hex");
  }

  const webhookRes = await fetch(`${BASE}/api/whatsapp/webhook`, {
    method: "POST",
    headers,
    body,
  });
  if (webhookRes.status !== 200) {
    fail(`Webhook respondió ${webhookRes.status}`);
  } else {
    ok(`Webhook aceptado (${webhookRes.status})`);
  }

  await new Promise((r) => setTimeout(r, 2000));

  const rows = await sql`
    SELECT m.id, m.body, m.message_type, m.media_asset_id, a.public_url
    FROM lead_messages m
    LEFT JOIN media_assets a ON a.id = m.media_asset_id
    WHERE m.conversation_id = ${testWaId}
    ORDER BY m.created_at DESC
    LIMIT 5
  `;

  if (rows.length === 0) {
    fail("No se persistió ningún mensaje para la conversación de prueba");
  } else {
    ok(`Mensaje persistido: type=${rows[0].message_type} body=${String(rows[0].body).slice(0, 60)}`);
    const body = String(rows[0].body ?? "");
    if (body.includes("[image]")) fail("Apareció [image] en el body");
    else ok("No aparece [image]");
  }

  // Probar upload directo a storage si Supabase configurado
  const { mediaService } = await import("../src/services/media.service");
  if (!mediaService.isConfigured()) {
    fail("Supabase Storage no configurado");
  } else {
    const asset = await mediaService.uploadChatMedia({
      companyId: "company-default",
      conversationId: testWaId,
      direction: "outbound",
      fileName: "e2e-test.png",
      mimeType: "image/png",
      data: pngBuffer(),
    });
    ok(`Upload Supabase OK: ${asset.id}`);

    const urlCheck = await fetch(asset.publicUrl, { method: "HEAD" });
    if (urlCheck.ok) ok(`URL pública accesible (${urlCheck.status})`);
    else fail(`URL pública no accesible (${urlCheck.status}) ${asset.publicUrl}`);
  }

  await sql.end();
  console.log("\n--- RESUMEN ---");
  for (const r of results) console.log(r);
  const failed = results.filter((r) => r.startsWith("FAIL"));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

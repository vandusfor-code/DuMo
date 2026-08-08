#!/usr/bin/env node
/**
 * Verifica que DuMo esté listo para cortar dulabs y usar solo QR.
 * Uso: node scripts/verify-web-qr-cutover.mjs [baseUrl]
 * Default baseUrl: https://du-mo.vercel.app
 */

const base = (process.argv[2] || process.env.DUMO_URL || "https://du-mo.vercel.app").replace(
  /\/$/,
  "",
);
const bridge =
  process.env.WEB_QR_BRIDGE_URL?.replace(/\/$/, "") ||
  "https://dumo-production.up.railway.app";

async function getJson(url, label) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const body = await res.json().catch(() => null);
    return { label, ok: res.ok, status: res.status, body };
  } catch (err) {
    return {
      label,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}

console.log(`\nDuMo QR cutover check — ${base}\n`);

const [diag, db, bridgeHealth] = await Promise.all([
  getJson(`${base}/api/system/web-qr`, "DuMo QR diagnostic"),
  getJson(`${base}/api/system/db`, "Database"),
  getJson(`${bridge}/health`, "Bridge health"),
]);

let ready = true;

console.log("1. Variables y bridge");
if (!diag.body?.configured) {
  fail("Faltan WEB_QR_* en Vercel");
  ready = false;
} else {
  pass("WEB_QR_* configurado en DuMo");
}

if (!bridgeHealth.ok || !bridgeHealth.body?.ok) {
  fail(`Bridge no responde en ${bridge}/health`);
  ready = false;
} else {
  pass(`Bridge OK (${bridge})`);
}

console.log("\n2. Base de datos");
if (!db.body?.connected) {
  fail(`BD no conectada: ${db.body?.error ?? db.error ?? "?"}`);
  ready = false;
} else {
  pass(`${db.body.conversations ?? "?"} conversaciones, ${db.body.messages ?? "?"} mensajes`);
}

console.log("\n3. Sesión QR");
const sessions = bridgeHealth.body?.sessions ?? 0;
const persisted = bridgeHealth.body?.persistedSessions ?? 0;
const connected = (bridgeHealth.body?.active ?? []).some((s) => s.status === "CONNECTED");

if (connected) {
  pass("Hay sesión QR CONNECTED en el bridge");
} else if (persisted > 0) {
  warn("Hay credenciales en disco pero no conectado — abre /admin/web-qr o espera reconexión");
  ready = false;
} else {
  fail("Sin sesión QR — ve a /admin/web-qr, genera QR y escanea ANTES de cortar dulabs");
  ready = false;
}

console.log("\n4. Webhook DuMo ← bridge");
if (diag.body?.webhookReachable?.ok) {
  pass("Webhook /api/web-qr/webhook responde");
} else {
  fail("Webhook QR no OK — revisa WEB_QR_WEBHOOK_SECRET = DUMO_WEBHOOK_SECRET");
  ready = false;
}

if (diag.body?.bridgeWebhookTest?.ok) {
  pass("Bridge puede enviar eventos a DuMo");
} else if (connected) {
  fail("Test bridge→DuMo falló");
  ready = false;
}

if (Array.isArray(diag.body?.problems) && diag.body.problems.length) {
  console.log("\nProblemas reportados:");
  for (const p of diag.body.problems) console.log(`  • ${p}`);
}

console.log("\n5. Antes de desvincular dulabs");
console.log("  • Enviar WhatsApp de prueba AL número → debe aparecer en Leads (hilo webqr:…)");
console.log("  • Responder desde DuMo → cliente debe recibir en celular");
console.log("  • Recién entonces: desactivar reenvío webhook en dulabs");

console.log(
  ready && diag.body?.readyForQr
    ? "\n✅ Listo para cortar dulabs (después de prueba manual entrante/saliente).\n"
    : "\n❌ Aún no listo — completa los pasos en /admin/web-qr\n",
);

process.exit(ready && diag.body?.readyForQr ? 0 : 1);

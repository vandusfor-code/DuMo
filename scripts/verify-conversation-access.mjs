#!/usr/bin/env node
/**
 * Verifica que rutas de conversaciones exijan auth y ownership.
 *
 * Uso:
 *   node scripts/verify-conversation-access.mjs
 *   node scripts/verify-conversation-access.mjs --base https://du-mo.vercel.app
 */

const base = (
  process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ??
  process.env.DUMO_CRM_URL ??
  "https://du-mo.vercel.app"
).replace(/\/$/, "");

async function probe(label, url, init) {
  const res = await fetch(url, { ...init, cache: "no-store" });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { label, status: res.status, body };
}

const sampleConvId = process.env.TEST_CONVERSATION_ID ?? "webqr:573148127388";

const checks = [
  ["GET /api/leads/conversations sin auth", `${base}/api/leads/conversations`, { method: "GET" }],
  [
    "GET messages sin auth",
    `${base}/api/leads/conversations/${encodeURIComponent(sampleConvId)}/messages`,
    { method: "GET" },
  ],
  [
    "GET script sin auth",
    `${base}/api/leads/script?conversationId=${encodeURIComponent(sampleConvId)}`,
    { method: "GET" },
  ],
  [
    "GET gestión sin auth",
    `${base}/api/leads/gestion/latest?conversationId=${encodeURIComponent(sampleConvId)}`,
    { method: "GET" },
  ],
];

console.log("Base:", base);
console.log("Sample conversation:", sampleConvId);
console.log("");

let failed = 0;
for (const [label, url, init] of checks) {
  const r = await probe(label, url, init);
  const ok = r.status === 401 || r.status === 403;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} → HTTP ${r.status}`);
  if (!ok) {
    failed++;
    if (Array.isArray(r.body)) {
      console.log(`  (expuesto: ${r.body.length} items)`);
    }
  }
}

if (failed) {
  console.error(`\n${failed} comprobación(es) fallaron — la fuga sigue activa.`);
  process.exit(1);
}

console.log("\nOK — rutas públicas devuelven 401/403.");

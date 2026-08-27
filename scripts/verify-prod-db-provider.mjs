#!/usr/bin/env node
/**
 * Salvaguarda: confirma que producción apunta a Railway Postgres, no Supabase.
 * Uso:
 *   node scripts/verify-prod-db-provider.mjs
 *   node scripts/verify-prod-db-provider.mjs https://du-mo.vercel.app
 */

const base = (process.argv[2] || "https://du-mo.vercel.app").replace(/\/$/, "");
const railway = "https://dumo-crm-production.up.railway.app";

async function probe(label, url) {
  const res = await fetch(`${url}/api/system/db`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => null);
  return { label, url, status: res.status, body };
}

const [vercel, crm] = await Promise.all([probe("Vercel", base), probe("Railway CRM", railway)]);

let ok = true;

function line(result) {
  const p = result.body?.provider ?? "?";
  const c = result.body?.conversations ?? "?";
  const m = result.body?.messages ?? "?";
  const pass = p === "postgres" && result.body?.connected;
  if (!pass) ok = false;
  console.log(
    `${pass ? "✓" : "✗"} ${result.label}: provider=${p} connected=${result.body?.connected} conv=${c} msgs=${m}`,
  );
}

console.log(`\nDuMo DB provider check — ${new Date().toISOString()}\n`);
line(vercel);
line(crm);

if (vercel.body && crm.body) {
  const parity =
    vercel.body.conversations === crm.body.conversations &&
    vercel.body.messages === crm.body.messages;
  console.log(parity ? "✓ Paridad conv/messages Vercel ↔ Railway" : "✗ Paridad conv/messages NO coincide");
  if (!parity) ok = false;
}

console.log(
  ok
    ? "\n✅ Producción en Railway Postgres.\n"
    : "\n❌ ALERTA: provider !== postgres o sin paridad — revisar DATABASE_URL1 / deploy Vercel.\n",
);

process.exit(ok ? 0 : 1);

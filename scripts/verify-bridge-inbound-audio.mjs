#!/usr/bin/env node
/**
 * Verifica audio entrante QR en Supabase Storage (post-prueba desde celular).
 *
 * Uso:
 *   node --env-file=.env.vercel.production scripts/verify-bridge-inbound-audio.mjs
 *   node --env-file=.env.vercel.production scripts/verify-bridge-inbound-audio.mjs --phone 573001234567
 */

import { createClient } from "@supabase/supabase-js";

const phoneArg = process.argv.find((a) => a.startsWith("--phone="))?.split("=")[1];
const phone = (phoneArg ?? process.env.TEST_QR_PHONE ?? "").replace(/\D/g, "");

const supabaseUrl =
  process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "dumo-media";
const companyId = process.env.DUMO_COMPANY_ID?.trim() || "company-default";

if (!supabaseUrl || !serviceKey) {
  console.error("Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const prefix = phone
  ? `companies/${companyId}/chat/inbound/webqr:${phone}/`
  : `companies/${companyId}/chat/inbound/`;

const { data, error } = await supabase.storage.from(bucket).list(
  phone ? `companies/${companyId}/chat/inbound/webqr:${phone}` : `companies/${companyId}/chat/inbound`,
  { limit: 100, sortBy: { column: "created_at", order: "desc" } },
);

if (error) {
  console.error("Error listando storage:", error.message);
  process.exit(1);
}

const files = (data ?? []).filter((f) => f.name && !f.name.endsWith("/"));
console.log(`Bucket: ${bucket}`);
console.log(`Prefijo: ${prefix}`);
console.log(`Archivos recientes (${files.length}):`);

for (const file of files.slice(0, 10)) {
  const path = phone
    ? `${prefix}${file.name}`
    : `companies/${companyId}/chat/inbound/${file.name}`;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  console.log(`  - ${file.name}  ${pub.publicUrl}`);
}

if (files.length === 0) {
  console.log("  (ninguno — envía un audio al número QR y vuelve a ejecutar)");
}

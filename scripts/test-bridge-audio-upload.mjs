#!/usr/bin/env node
/**
 * Prueba local del pipeline Supabase del bridge (Fase A) sin deploy.
 * Uso:
 *   node --env-file=.env.vercel.production scripts/test-bridge-audio-upload.mjs
 */

import { uploadInboundAudioToSupabase, getSupabaseStorageStatus } from "../services/web-qr-bridge/src/supabase-upload.js";
import {
  assertAllowedInboundAudioMime,
  extensionFromAudioMime,
  newMediaAssetId,
} from "../services/web-qr-bridge/src/media-config.js";

const phone = (process.argv.find((a) => a.startsWith("--phone="))?.split("=")[1] ?? "573009999999").replace(
  /\D/g,
  "",
);

const status = getSupabaseStorageStatus();
if (!status.configured) {
  console.error("Supabase no configurado:", status);
  process.exit(1);
}

const mimeType = assertAllowedInboundAudioMime("audio/ogg; codecs=opus", true);
const buffer = Buffer.from(
  "OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
  "binary",
);
const assetId = newMediaAssetId();
const extension = extensionFromAudioMime(mimeType);

const uploaded = await uploadInboundAudioToSupabase({
  phone,
  assetId,
  extension,
  data: buffer,
  contentType: mimeType,
});

console.log("OK: upload Supabase (bridge pipeline)");
console.log("  phone:", phone);
console.log("  storagePath:", uploaded.storagePath);
console.log("  publicUrl:", uploaded.publicUrl);
console.log("  bytes:", buffer.length);

const res = await fetch(uploaded.publicUrl, { method: "HEAD" });
console.log("  HEAD publicUrl:", res.status, res.headers.get("content-type"));

import { downloadMediaMessage } from "@whiskeysockets/baileys";
import pino from "pino";
import {
  assertAllowedInboundAudioMime,
  DEFAULT_COMPANY_ID,
  extensionFromAudioMime,
  MAX_INBOUND_AUDIO_BYTES,
  newMediaAssetId,
} from "./media-config.js";
import { uploadInboundAudioToSupabase } from "./supabase-upload.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

/**
 * Descarga audio de Baileys y lo sube a Supabase Storage.
 * @param {object} input
 * @param {import("@whiskeysockets/baileys").WASocket} input.sock
 * @param {import("@whiskeysockets/baileys").WAMessage} input.msg
 * @param {import("@whiskeysockets/baileys").proto.Message.IAudioMessage} input.audioMessage
 * @param {string} input.phone
 */
export async function processInboundAudioMessage(input) {
  const { sock, msg, audioMessage, phone } = input;
  if (!sock?.updateMediaMessage) {
    throw new Error("Socket Baileys no disponible para descargar audio.");
  }

  const ptt = Boolean(audioMessage?.ptt);
  const mimeType = assertAllowedInboundAudioMime(audioMessage?.mimetype, ptt);

  const buffer = await downloadMediaMessage(
    msg,
    "buffer",
    {},
    {
      logger: log,
      reuploadRequest: sock.updateMediaMessage.bind(sock),
    },
  );

  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Descarga de audio inválida (no buffer).");
  }
  if (buffer.length <= 0) {
    throw new Error("Audio vacío.");
  }
  if (buffer.length > MAX_INBOUND_AUDIO_BYTES) {
    throw new Error(
      `Audio demasiado grande (${buffer.length} bytes, máx ${MAX_INBOUND_AUDIO_BYTES}).`,
    );
  }

  const assetId = newMediaAssetId();
  const extension = extensionFromAudioMime(mimeType);
  const { publicUrl, storagePath } = await uploadInboundAudioToSupabase({
    companyId: DEFAULT_COMPANY_ID,
    phone,
    assetId,
    extension,
    data: buffer,
    contentType: mimeType,
  });

  log.info(
    {
      messageId: msg.key?.id,
      phone,
      bytes: buffer.length,
      mimeType,
      ptt,
      storagePath,
      publicUrl,
    },
    "audio QR subido a Supabase",
  );

  return {
    publicUrl,
    storagePath,
    mimeType,
    ptt,
    bytes: buffer.length,
  };
}

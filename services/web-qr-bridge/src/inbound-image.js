import { downloadMediaMessage } from "@whiskeysockets/baileys";
import pino from "pino";
import {
  assertAllowedInboundImageMime,
  DEFAULT_COMPANY_ID,
  extensionFromImageMime,
  MAX_INBOUND_IMAGE_BYTES,
  newMediaAssetId,
} from "./media-config.js";
import { uploadInboundChatMediaToSupabase } from "./supabase-upload.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

/**
 * Descarga imagen de Baileys y la sube a Supabase Storage.
 * @param {object} input
 * @param {import("@whiskeysockets/baileys").WASocket} input.sock
 * @param {import("@whiskeysockets/baileys").WAMessage} input.msg
 * @param {import("@whiskeysockets/baileys").proto.Message.IImageMessage} input.imageMessage
 * @param {string} input.phone
 */
export async function processInboundImageMessage(input) {
  const { sock, msg, imageMessage, phone } = input;
  if (!sock?.updateMediaMessage) {
    throw new Error("Socket Baileys no disponible para descargar imagen.");
  }

  const mimeType = assertAllowedInboundImageMime(imageMessage?.mimetype);

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
    throw new Error("Descarga de imagen inválida (no buffer).");
  }
  if (buffer.length <= 0) {
    throw new Error("Imagen vacía.");
  }
  if (buffer.length > MAX_INBOUND_IMAGE_BYTES) {
    throw new Error(
      `Imagen demasiado grande (${buffer.length} bytes, máx ${MAX_INBOUND_IMAGE_BYTES}).`,
    );
  }

  const assetId = newMediaAssetId();
  const extension = extensionFromImageMime(mimeType);
  const { publicUrl, storagePath } = await uploadInboundChatMediaToSupabase({
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
      storagePath,
      publicUrl,
    },
    "imagen QR subida a Supabase",
  );

  return {
    publicUrl,
    storagePath,
    mimeType,
    bytes: buffer.length,
    caption: imageMessage?.caption?.trim() || "",
  };
}

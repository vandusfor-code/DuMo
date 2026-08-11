/**
 * DuMo Web QR Bridge — proceso persistente (NO Vercel).
 *
 * Baileys mantiene sesiones WhatsApp Web y reenvía mensajes a DuMo.
 * Despliega en Railway, Fly.io o VPS con al menos 512 MB RAM.
 *
 * Env:
 *   PORT=8787
 *   BRIDGE_SECRET=...
 *   SESSIONS_DIR=./data/sessions
 *   DUMO_WEBHOOK_URL=https://du-mo.vercel.app/api/web-qr/webhook
 *   DUMO_WEBHOOK_SECRET=...
 */

import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import pino from "pino";
import NodeCache from "node-cache";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  extractMessageContent,
  getContentType,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { processInboundAudioMessage } from "./inbound-audio.js";
import { processInboundImageMessage } from "./inbound-image.js";
import { prepareWhatsAppAudio } from "./audio-transcode.js";
import {
  assertAllowedInboundAudioMime,
  extensionFromAudioMime,
  isSupabaseStorageConfigured,
  MAX_INBOUND_AUDIO_BYTES,
  newMediaAssetId,
} from "./media-config.js";
import { getSupabaseStorageStatus } from "./supabase-upload.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
const msgRetryCounterCache = new NodeCache();
const PORT = Number(process.env.PORT ?? 8787);
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? "";
const SESSIONS_DIR = process.env.SESSIONS_DIR ?? "./data/sessions";

if (!BRIDGE_SECRET) {
  console.error("Falta BRIDGE_SECRET");
  process.exit(1);
}

fs.mkdirSync(SESSIONS_DIR, { recursive: true });

/** @type {Map<string, SessionRuntime>} */
const sessions = new Map();

/**
 * @typedef {Object} SessionRuntime
 * @property {string} sessionId
 * @property {string} channelId
 * @property {string} label
 * @property {string} webhookUrl
 * @property {string} webhookSecret
 * @property {'INITIALIZING'|'QR_PENDING'|'CONNECTED'|'DISCONNECTED'} status
 * @property {string|null} qrDataUrl
 * @property {string|null} phoneNumber
 * @property {import('@whiskeysockets/baileys').WASocket|null} sock
 */

function auth(req, res, next) {
  const provided = req.headers["x-web-qr-bridge-secret"];
  if (provided !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function notifyDuMo(session, body) {
  const webhookUrl = (session.webhookUrl || process.env.DUMO_WEBHOOK_URL || "").trim();
  const webhookSecret = (session.webhookSecret || process.env.DUMO_WEBHOOK_SECRET || "").trim();
  if (!webhookUrl || !webhookSecret) {
    session.lastWebhookStatus = 0;
    session.lastWebhookError = "webhook no configurado";
    log.error({ channelId: session.channelId, type: body.type }, "webhook DuMo NO configurado — evento perdido");
    return;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Web-Qr-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify(body),
    });
    session.lastWebhookStatus = res.status;
    session.lastWebhookAt = new Date().toISOString();
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      session.lastWebhookError = detail.slice(0, 200) || `HTTP ${res.status}`;
      log.error(
        { status: res.status, detail: session.lastWebhookError, channelId: session.channelId, type: body.type },
        "webhook DuMo respondió error",
      );
    } else {
      session.lastWebhookError = null;
    }
  } catch (err) {
    session.lastWebhookStatus = 0;
    session.lastWebhookError = err instanceof Error ? err.message : String(err);
    log.error({ err, channelId: session.channelId, type: body.type }, "webhook DuMo falló");
  }
}

/** @type {Map<string, import('@whiskeysockets/baileys').proto.IMessage>} */
const messageStore = new Map();

function messageStoreKey(key) {
  return `${key?.remoteJid ?? ""}|${key?.id ?? ""}`;
}

function rememberMessage(msg) {
  if (!msg?.key?.id || !msg.message) return;
  messageStore.set(messageStoreKey(msg.key), msg.message);
  if (messageStore.size > 8000) {
    const oldest = messageStore.keys().next().value;
    if (oldest) messageStore.delete(oldest);
  }
}

function isLikelyLidDigits(digits) {
  return String(digits ?? "").replace(/\D/g, "").length >= 15;
}

function phoneFromJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  const user = jid.split("@")[0] ?? "";
  const local = user.split(":")[0] ?? user;
  return local.replace(/\D/g, "");
}

function normalizeStoredPhone(digits) {
  let d = String(digits ?? "").replace(/\D/g, "");
  if (d.length === 14 && d.startsWith("57")) d = d.slice(0, 12);
  if (d.length === 13 && d.startsWith("56")) d = d.slice(0, 11);
  return d;
}

function digitsFromJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  if (jid.endsWith("@lid")) {
    return (jid.split("@")[0] ?? "").replace(/\D/g, "");
  }
  return normalizeStoredPhone(phoneFromJid(jid));
}

/** Teléfono real + JID para responder (Baileys usa @lid cuando oculta el número). */
function extractInboundSender(msg) {
  const key = msg.key ?? {};
  const remoteJid = key.remoteJid ?? "";
  const remoteJidAlt = key.remoteJidAlt ?? "";
  const senderPn = key.senderPn ?? "";

  let senderJid = remoteJid;
  let fromDigits = digitsFromJid(remoteJid);

  if (remoteJidAlt.includes("@s.whatsapp.net")) {
    const altDigits = digitsFromJid(remoteJidAlt);
    if (altDigits.length >= 8 && altDigits.length <= 13) {
      fromDigits = altDigits;
    }
    senderJid = remoteJid.endsWith("@lid") ? remoteJid : remoteJidAlt;
  } else if (String(senderPn).includes("@s.whatsapp.net")) {
    const pnDigits = digitsFromJid(senderPn);
    if (pnDigits.length >= 8 && pnDigits.length <= 13) {
      fromDigits = pnDigits;
      senderJid = remoteJid.endsWith("@lid") ? remoteJid : senderPn;
    }
  } else if (remoteJid.endsWith("@lid") && isLikelyLidDigits(fromDigits)) {
    senderJid = remoteJid;
  }

  if (!senderJid && remoteJid) senderJid = remoteJid;

  const senderPhone =
    fromDigits && !isLikelyLidDigits(fromDigits) ? fromDigits : undefined;

  return { from: fromDigits, senderJid: senderJid || undefined, senderPhone };
}

function extractMessageText(msg) {
  if (!msg?.message) return "";
  const content = extractMessageContent(msg.message);
  if (!content) return "";
  const type = getContentType(content);
  if (!type) return "";
  if (type === "conversation") return content.conversation ?? "";
  if (type === "extendedTextMessage") return content.extendedTextMessage?.text ?? "";
  if (type === "imageMessage") return content.imageMessage?.caption ?? "";
  if (type === "videoMessage") return content.videoMessage?.caption ?? "";
  if (type === "documentMessage") return content.documentMessage?.caption ?? "";
  if (type === "buttonsResponseMessage") return content.buttonsResponseMessage?.selectedDisplayText ?? "";
  if (type === "listResponseMessage") {
    return content.listResponseMessage?.title ?? content.listResponseMessage?.singleSelectReply?.selectedRowId ?? "";
  }
  if (type === "templateButtonReplyMessage") {
    return content.templateButtonReplyMessage?.selectedDisplayText ?? "";
  }
  return "";
}

async function resolveInboundPhone(session, { from, senderJid, senderPhone }) {
  if (senderPhone) return senderPhone;
  if (from && !isLikelyLidDigits(from)) return from;

  if (senderJid?.endsWith("@lid") && session.lidByPn) {
    for (const [pn, lid] of session.lidByPn.entries()) {
      if (lid === senderJid) {
        const d = String(pn).replace(/@s\.whatsapp\.net$/i, "").replace(/\D/g, "");
        if (d.length >= 8 && d.length <= 13) return d;
      }
    }
  }

  const mapping = session.sock?.signalRepository?.lidMapping;
  if (senderJid?.endsWith("@lid") && mapping?.getPNForLID) {
    try {
      const pn = await mapping.getPNForLID(senderJid);
      if (pn) {
        const d = digitsFromJid(pn);
        if (d.length >= 8 && d.length <= 13) return d;
      }
    } catch (err) {
      log.warn({ err, senderJid }, "getPNForLID falló");
    }
  }

  return from;
}

async function forwardInboundToDuMo(session, msg, upsertType) {
  const remoteJid = msg.key?.remoteJid ?? "";
  if (shouldSkipInboundJid(remoteJid)) return;

  let { from, senderJid, senderPhone } = extractInboundSender(msg);
  if (!from && !senderJid) {
    log.warn({ channelId: session.channelId, remoteJid, upsertType }, "mensaje QR sin remitente");
    return;
  }

  senderPhone = await resolveInboundPhone(session, { from, senderJid, senderPhone });

  if (senderJid?.endsWith("@lid") && senderPhone) {
    rememberLidMapping(session, senderJid, senderPhone);
  }

  const text = extractMessageText(msg);
  const content = extractMessageContent(msg.message ?? {});
  const isImage = Boolean(content?.imageMessage);
  const isAudio = Boolean(content?.audioMessage);
  if (!text && !isImage && !isAudio) {
    rememberMessage(msg);
    return;
  }

  rememberMessage(msg);
  const ts = Number(msg.messageTimestamp ?? Math.floor(Date.now() / 1000));
  const resolvedPhone = senderPhone ?? from;

  /** @type {Record<string, unknown>} */
  const payload = {
    channelId: session.channelId,
    from: resolvedPhone,
    senderJid,
    messageId: msg.key.id ?? `qr-${Date.now()}`,
    timestamp: ts,
    type: isImage ? "image" : isAudio ? "audio" : "text",
    text: text || undefined,
    customerName: msg.pushName ?? "",
  };

  if (isAudio) {
    if (!isSupabaseStorageConfigured()) {
      log.error({ channelId: session.channelId, messageId: msg.key.id }, "audio QR: Supabase no configurado");
      payload.type = "text";
      payload.text =
        "⚠️ No se pudo recibir el audio (almacenamiento no configurado). Pide al cliente que lo reenvíe.";
    } else if (!session.sock) {
      log.error({ channelId: session.channelId, messageId: msg.key.id }, "audio QR: socket no conectado");
      payload.type = "text";
      payload.text = "⚠️ No se pudo recibir el audio. Pide al cliente que lo reenvíe.";
    } else {
      try {
        const audio = await processInboundAudioMessage({
          sock: session.sock,
          msg,
          audioMessage: content.audioMessage,
          phone: resolvedPhone,
        });
        payload.mediaUrl = audio.publicUrl;
        payload.mimeType = audio.mimeType;
        payload.audioPtt = audio.ptt;
        if (!payload.text) {
          payload.text = audio.ptt ? "🎤 Nota de voz" : "🔊 Audio";
        }
      } catch (err) {
        log.error(
          { err, channelId: session.channelId, messageId: msg.key.id },
          "audio QR: descarga o upload falló",
        );
        payload.type = "text";
        payload.text =
          err instanceof Error && err.message.includes("no compatible")
            ? `⚠️ ${err.message}`
            : "⚠️ No se pudo recibir el audio. Pide al cliente que lo reenvíe.";
      }
    }
  }

  if (isImage) {
    if (!isSupabaseStorageConfigured()) {
      log.error({ channelId: session.channelId, messageId: msg.key.id }, "image QR: Supabase no configurado");
      payload.type = "text";
      payload.text =
        "⚠️ No se pudo recibir la imagen (almacenamiento no configurado). Pide al cliente que la reenvíe.";
    } else if (!session.sock) {
      log.error({ channelId: session.channelId, messageId: msg.key.id }, "image QR: socket no conectado");
      payload.type = "text";
      payload.text = "⚠️ No se pudo recibir la imagen. Pide al cliente que la reenvíe.";
    } else {
      try {
        const image = await processInboundImageMessage({
          sock: session.sock,
          msg,
          imageMessage: content.imageMessage,
          phone: resolvedPhone,
        });
        payload.mediaUrl = image.publicUrl;
        payload.mimeType = image.mimeType;
        if (image.caption) payload.caption = image.caption;
        if (!payload.text) {
          payload.text = image.caption || "📷 Imagen";
        }
      } catch (err) {
        log.error(
          { err, channelId: session.channelId, messageId: msg.key.id },
          "image QR: descarga o upload falló",
        );
        payload.type = "text";
        payload.text = "⚠️ No se pudo recibir la imagen. Pide al cliente que la reenvíe.";
      }
    }
  }

  await notifyDuMo(session, {
    type: "message.inbound",
    payload,
  });
  log.info(
    {
      channelId: session.channelId,
      from,
      senderJid,
      messageId: msg.key.id,
      upsertType,
      inboundType: payload.type,
      hasMediaUrl: Boolean(payload.mediaUrl),
      text: typeof payload.text === "string" ? payload.text.slice(0, 40) : undefined,
    },
    "mensaje QR reenviado a DuMo",
  );
}

function shouldSkipInboundJid(remoteJid) {
  if (!remoteJid) return true;
  if (remoteJid === "status@broadcast") return true;
  if (remoteJid.endsWith("@broadcast")) return true;
  if (remoteJid.endsWith("@newsletter")) return true;
  return false;
}

function hasPersistedCreds(channelId) {
  return fs.existsSync(path.join(SESSIONS_DIR, channelId, "creds.json"));
}

function createSessionRuntime(channelId, overrides = {}) {
  const sessionId = `bridge-${channelId}`;
  return {
    sessionId,
    channelId,
    label: overrides.label ?? channelId,
    webhookUrl: (overrides.webhookUrl ?? process.env.DUMO_WEBHOOK_URL ?? "").trim(),
    webhookSecret: (overrides.webhookSecret ?? process.env.DUMO_WEBHOOK_SECRET ?? "").trim(),
    status: "INITIALIZING",
    qrDataUrl: null,
    phoneNumber: null,
    sock: null,
    lastError: null,
    lastWebhookStatus: null,
    lastWebhookError: null,
    lastWebhookAt: null,
    lidByPn: new Map(),
  };
}

function rememberLidMapping(session, lidJid, pnDigits) {
  if (!session || !lidJid?.endsWith("@lid") || !pnDigits) return;
  const digits = String(pnDigits).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 13) return;
  const pnJid = `${digits}@s.whatsapp.net`;
  session.lidByPn.set(pnJid, lidJid);
  session.lidByPn.set(digits, lidJid);
  const mapping = session.sock?.signalRepository?.lidMapping;
  if (mapping?.storeLIDPNMappings) {
    try {
      mapping.storeLIDPNMappings([{ lid: lidJid, pn: pnJid }]);
    } catch (err) {
      log.warn({ err, lidJid, pnJid }, "storeLIDPNMappings falló");
    }
  }
}

async function resolveLidForPn(session, pnJid) {
  const normalized = pnJid.toLowerCase();
  const mapped = session.lidByPn?.get(normalized) ?? session.lidByPn?.get(normalized.split("@")[0]);
  if (mapped) return mapped;

  const mapping = session.sock?.signalRepository?.lidMapping;
  if (mapping?.getLIDForPN) {
    try {
      const lid = await mapping.getLIDForPN(normalized);
      if (lid) return lid;
    } catch (err) {
      log.warn({ err, pnJid: normalized }, "getLIDForPN falló");
    }
  }
  return null;
}

async function resolveSendJid(session, { to, jid }) {
  if (typeof jid === "string" && jid.includes("@")) {
    const trimmed = jid.trim().toLowerCase();
    if (trimmed.endsWith("@lid")) return trimmed;
    const lid = await resolveLidForPn(session, trimmed);
    return lid ?? trimmed;
  }

  const digits = String(to ?? "").replace(/\D/g, "");
  if (!digits) throw new Error("Destino inválido");
  if (digits.length >= 15) return `${digits}@lid`;

  const pnJid = `${digits}@s.whatsapp.net`;
  const lid = await resolveLidForPn(session, pnJid);
  return lid ?? pnJid;
}

function bootstrapSession(channelId, overrides = {}) {
  const sessionId = `bridge-${channelId}`;
  let session = sessions.get(sessionId);
  if (!session) {
    session = createSessionRuntime(channelId, overrides);
    sessions.set(sessionId, session);
  }
  if (!session.sock) {
    startBaileys(session).catch((err) => {
      session.lastError = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId }, "startBaileys falló");
    });
  }
  return session;
}

function listPersistedChannelIds() {
  try {
    return fs
      .readdirSync(SESSIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((channelId) => hasPersistedCreds(channelId));
  } catch {
    return [];
  }
}

function restorePersistedSessions() {
  const channelIds = listPersistedChannelIds();
  if (channelIds.length === 0) return;
  log.info({ count: channelIds.length, channelIds }, "restaurando sesiones QR desde disco");
  for (const channelId of channelIds) {
    bootstrapSession(channelId);
  }
}

async function waitForConnected(session, maxSeconds = 20) {
  if (session.sock && session.status === "CONNECTED") return true;
  for (let i = 0; i < maxSeconds; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (session.sock && session.status === "CONNECTED") return true;
    if (session.status === "QR_PENDING") return false;
  }
  return session.sock && session.status === "CONNECTED";
}

const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const MEDIA_FETCH_TIMEOUT_MS = 15_000;
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateMediaUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("mediaUrl requerida");
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("mediaUrl inválida");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("mediaUrl debe ser http(s)");
  }
  return url.toString();
}

function inferImageMimeType(mediaUrl, headerMime) {
  const normalized = String(headerMime ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (normalized && ALLOWED_IMAGE_MIMES.has(normalized)) return normalized;

  const ext = path.extname(new URL(mediaUrl).pathname).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function fetchImageFromUrl(mediaUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(mediaUrl, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) {
      throw new Error(`No se pudo descargar imagen (HTTP ${res.status})`);
    }

    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MEDIA_MAX_BYTES) {
      throw new Error(`Imagen demasiado grande (máx ${MEDIA_MAX_BYTES} bytes)`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MEDIA_MAX_BYTES) {
      throw new Error(`Imagen demasiado grande (máx ${MEDIA_MAX_BYTES} bytes)`);
    }

    const mimeType = inferImageMimeType(
      mediaUrl,
      res.headers.get("content-type") ?? undefined,
    );
    if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
      throw new Error(`Tipo de imagen no soportado (${mimeType})`);
    }

    return { buffer, mimeType };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timeout descargando imagen");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAudioFromUrl(audioUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(audioUrl, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) {
      throw new Error(`No se pudo descargar audio (HTTP ${res.status})`);
    }

    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_INBOUND_AUDIO_BYTES) {
      throw new Error(`Audio demasiado grande (máx ${MAX_INBOUND_AUDIO_BYTES} bytes)`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_INBOUND_AUDIO_BYTES) {
      throw new Error(`Audio demasiado grande (máx ${MAX_INBOUND_AUDIO_BYTES} bytes)`);
    }

    const headerMime = res.headers.get("content-type") ?? undefined;
    let mimeType;
    try {
      mimeType = assertAllowedInboundAudioMime(headerMime, false);
    } catch {
      const ext = path.extname(new URL(audioUrl).pathname).toLowerCase();
      if (ext === ".mp3") mimeType = assertAllowedInboundAudioMime("audio/mpeg", false);
      else if (ext === ".ogg" || ext === ".opus") {
        mimeType = assertAllowedInboundAudioMime("audio/ogg", true);
      } else if (ext === ".webm") {
        mimeType = assertAllowedInboundAudioMime("audio/webm", false);
      } else {
        throw new Error(
          `Formato de audio no compatible (${headerMime || ext || "desconocido"}). Usa OGG/Opus o MP3.`,
        );
      }
    }
    return { buffer, mimeType };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timeout descargando audio");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {Promise<SessionRuntime>} */
async function getConnectedSession(channelId) {
  const sessionId = `bridge-${channelId}`;
  let session = sessions.get(sessionId);

  if (!session && hasPersistedCreds(channelId)) {
    session = bootstrapSession(channelId);
  }

  if (session && !session.sock && session.status !== "QR_PENDING") {
    startBaileys(session).catch((err) => {
      session.lastError = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId }, "startBaileys en outbound falló");
    });
  }

  if (session && session.status !== "CONNECTED") {
    const connected = await waitForConnected(session, 20);
    if (!connected && session.status === "QR_PENDING") {
      const err = new Error("Sesión requiere escanear QR de nuevo");
      err.code = "QR_PENDING";
      throw err;
    }
  }

  if (!session?.sock) {
    const err = new Error("Sesión no conectada");
    err.code = "NOT_CONNECTED";
    throw err;
  }

  return session;
}

function mapOutboundSessionError(err, res) {
  if (err?.code === "QR_PENDING") {
    return res.status(503).json({ error: err.message });
  }
  if (err?.code === "NOT_CONNECTED") {
    return res.status(503).json({ error: err.message });
  }
  return null;
}

async function startBaileys(session) {
  if (session.starting) return;
  session.starting = true;

  try {
    if (session.sock) {
      try {
        session.sock.end(undefined);
      } catch {
        /* socket previo ya cerrado */
      }
      session.sock = null;
    }

    const dir = path.join(SESSIONS_DIR, session.channelId);
    fs.mkdirSync(dir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();
    const baileysLogger = pino({ level: "silent" });

  let sock;
  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    printQRInTerminal: false,
    logger: baileysLogger,
    browser: ["DuMo CRM", "Chrome", "120.0.0"],
    connectTimeoutMs: 60_000,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    emitOwnEvents: true,
    msgRetryCounterCache,
    getMessage: async (key) => {
      if (!key?.id) return undefined;
      return messageStore.get(messageStoreKey(key));
    },
    patchMessageBeforeSending: async (message) => {
      if (typeof sock?.uploadPreKeysToServerIfRequired === "function") {
        await sock.uploadPreKeysToServerIfRequired();
      }
      return message;
    },
  });

  session.sock = sock;
  session.status = "INITIALIZING";

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("lid-mapping.update", (mapping) => {
    if (!mapping || !session.lidByPn) return;
    for (const [pn, lid] of Object.entries(mapping)) {
      if (typeof lid === "string" && lid.endsWith("@lid")) {
        session.lidByPn.set(String(pn).toLowerCase(), lid);
      }
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.status = "QR_PENDING";
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
      log.info({ channelId: session.channelId }, "QR generado");
      io.to(session.sessionId).emit("qr", { qrDataUrl: session.qrDataUrl });
    }

    if (connection === "open") {
      if (!session.webhookUrl && process.env.DUMO_WEBHOOK_URL) {
        session.webhookUrl = process.env.DUMO_WEBHOOK_URL.trim();
      }
      if (!session.webhookSecret && process.env.DUMO_WEBHOOK_SECRET) {
        session.webhookSecret = process.env.DUMO_WEBHOOK_SECRET.trim();
      }
      session.status = "CONNECTED";
      session.qrDataUrl = null;
      session.phoneNumber = normalizeStoredPhone(phoneFromJid(sock.user?.id ?? ""));
      if (typeof sock.uploadPreKeysToServerIfRequired === "function") {
        try {
          await sock.uploadPreKeysToServerIfRequired();
        } catch (err) {
          log.warn({ err, channelId: session.channelId }, "uploadPreKeys al conectar falló");
        }
      }
      await notifyDuMo(session, {
        type: "session.connected",
        channelId: session.channelId,
        phoneNumber: session.phoneNumber,
        sessionData: { connectedAt: new Date().toISOString() },
      });
      await notifyDuMo(session, { type: "ping" });
      io.to(session.sessionId).emit("connected", { phoneNumber: session.phoneNumber });
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      session.status = "DISCONNECTED";
      session.sock = null;
      session.qrDataUrl = null;
      session.phoneNumber = null;

      if (code === DisconnectReason.loggedOut) {
        await notifyDuMo(session, { type: "session.loggedOut", channelId: session.channelId });
        log.info({ channelId: session.channelId }, "sesión cerrada desde el teléfono — borrando credenciales");
        sessions.delete(session.sessionId);
        try {
          fs.rmSync(path.join(SESSIONS_DIR, session.channelId), { recursive: true, force: true });
        } catch (err) {
          log.warn({ err, channelId: session.channelId }, "no se pudieron borrar credenciales tras logout");
        }
        return;
      }

      await notifyDuMo(session, { type: "session.disconnected", channelId: session.channelId });

      log.info({ channelId: session.channelId, code }, "reconectando Baileys…");
      setTimeout(() => startBaileys(session).catch((e) => log.error(e)), 3000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify" && type !== "append") return;
    const nowSec = Math.floor(Date.now() / 1000);

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const ts = Number(msg.messageTimestamp ?? 0);
      if (type === "append" && ts && nowSec - ts > 120) continue;

      await forwardInboundToDuMo(session, msg, type);
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const { key, update } of updates) {
      if (!key || key.fromMe || !update?.message) continue;
      const msg = { key, message: update.message, pushName: update.pushName };
      await forwardInboundToDuMo(session, msg, "update");
    }
  });
  } finally {
    session.starting = false;
  }
}

const app = express();
app.use(express.json());

app.post("/sessions", auth, async (req, res) => {
  const { channelId, label, webhookUrl, webhookSecret } = req.body ?? {};
  if (!channelId) return res.status(400).json({ error: "channelId requerido" });

  const sessionId = `bridge-${channelId}`;
  const trimmedWebhookUrl = (webhookUrl ?? process.env.DUMO_WEBHOOK_URL ?? "").trim();
  const trimmedWebhookSecret = (webhookSecret ?? process.env.DUMO_WEBHOOK_SECRET ?? "").trim();

  let session = sessions.get(sessionId);
  if (!session) {
    log.info({ channelId }, "nueva sesión Baileys");
    session = createSessionRuntime(channelId, {
      label: label ?? channelId,
      webhookUrl: trimmedWebhookUrl,
      webhookSecret: trimmedWebhookSecret,
    });
    sessions.set(sessionId, session);
    startBaileys(session).catch((err) => {
      session.lastError = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId }, "startBaileys falló");
    });
  } else {
    if (label) session.label = label;
    if (trimmedWebhookUrl) session.webhookUrl = trimmedWebhookUrl;
    if (trimmedWebhookSecret) session.webhookSecret = trimmedWebhookSecret;
    if (!session.sock && session.status !== "QR_PENDING") {
      log.info({ channelId }, "reiniciando sesión Baileys en memoria");
      startBaileys(session).catch((err) => {
        session.lastError = err instanceof Error ? err.message : String(err);
        log.error({ err, channelId }, "startBaileys falló");
      });
    }
  }

  res.json({
    sessionId,
    status: session.status,
    qrDataUrl: session.qrDataUrl ?? undefined,
    phoneNumber: session.phoneNumber ?? undefined,
    lastError: session.lastError ?? undefined,
    webhookConfigured: Boolean(session.webhookUrl && session.webhookSecret),
    lastWebhookStatus: session.lastWebhookStatus ?? undefined,
    lastWebhookError: session.lastWebhookError ?? undefined,
  });
});

app.get("/sessions/:sessionId", auth, async (req, res) => {
  const sessionId = req.params.sessionId;
  const channelId = sessionId.replace(/^bridge-/, "");
  let session = sessions.get(sessionId);

  if (!session && hasPersistedCreds(channelId)) {
    log.info({ channelId }, "GET /sessions — restaurando sesión desde disco");
    session = bootstrapSession(channelId);
    await waitForConnected(session, 10);
  }

  if (!session) {
    return res.status(404).json({ error: "Sesión no encontrada" });
  }

  res.json({
    sessionId: session.sessionId,
    status: session.status,
    qrDataUrl: session.qrDataUrl ?? undefined,
    phoneNumber: session.phoneNumber ?? undefined,
  });
});

app.delete("/sessions/:sessionId", auth, async (req, res) => {
  const sessionId = req.params.sessionId;
  const channelId = sessionId.replace(/^bridge-/, "");
  const session = sessions.get(sessionId);

  if (session) {
    try {
      await session.sock?.logout();
    } catch {
      /* ya desconectado */
    }
    try {
      session.sock?.end(undefined);
    } catch {
      /* socket ya cerrado */
    }
    sessions.delete(sessionId);
  }

  try {
    fs.rmSync(path.join(SESSIONS_DIR, channelId), { recursive: true, force: true });
    log.info({ channelId }, "credenciales QR eliminadas del disco");
  } catch (err) {
    log.warn({ err, channelId }, "no se pudieron borrar credenciales en disco");
  }

  res.json({ ok: true, purged: true, channelId });
});

app.post("/send", auth, async (req, res) => {
  const { channelId, to, jid, text } = req.body ?? {};
  if (!channelId) return res.status(400).json({ error: "channelId requerido" });

  let session;
  try {
    session = await getConnectedSession(channelId);
  } catch (err) {
    const mapped = mapOutboundSessionError(err, res);
    if (mapped) return mapped;
    throw err;
  }

  try {
    const targetJid = await resolveSendJid(session, { to, jid });
    log.info({ channelId, targetJid, inputJid: jid, to }, "enviando mensaje QR");
    const sent = await session.sock.sendMessage(targetJid, { text: text ?? "" });
    if (sent?.message) rememberMessage(sent);
    res.json({ id: sent?.key?.id ?? `out-${Date.now()}`, jid: targetJid });
  } catch (err) {
    log.error({ err, channelId, to, jid }, "sendMessage falló");
    res.status(502).json({
      error: err instanceof Error ? err.message : "No se pudo enviar por WhatsApp Web",
    });
  }
});

app.post("/send-media", auth, async (req, res) => {
  const { channelId, to, jid, mediaUrl, mimeType, caption } = req.body ?? {};
  if (!channelId) return res.status(400).json({ error: "channelId requerido" });

  let validatedUrl;
  try {
    validatedUrl = validateMediaUrl(mediaUrl);
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : "mediaUrl inválida",
    });
  }

  let session;
  try {
    session = await getConnectedSession(channelId);
  } catch (err) {
    const mapped = mapOutboundSessionError(err, res);
    if (mapped) return mapped;
    throw err;
  }

  try {
    const targetJid = await resolveSendJid(session, { to, jid });
    const { buffer, mimeType: fetchedMime } = await fetchImageFromUrl(validatedUrl);
    const resolvedMime =
      typeof mimeType === "string" && ALLOWED_IMAGE_MIMES.has(mimeType.toLowerCase())
        ? mimeType.toLowerCase()
        : fetchedMime;

    log.info(
      {
        channelId,
        targetJid,
        inputJid: jid,
        to,
        bytes: buffer.length,
        mimeType: resolvedMime,
        hasCaption: Boolean(caption),
      },
      "enviando imagen QR",
    );

    const payload = {
      image: buffer,
      mimetype: resolvedMime,
    };
    if (typeof caption === "string" && caption.trim()) {
      payload.caption = caption.trim();
    }

    const sent = await session.sock.sendMessage(targetJid, payload);
    if (sent?.message) rememberMessage(sent);
    res.json({ id: sent?.key?.id ?? `out-${Date.now()}`, jid: targetJid });
  } catch (err) {
    log.error({ err, channelId, to, jid, mediaUrl: validatedUrl }, "send-media falló");
    res.status(502).json({
      error: err instanceof Error ? err.message : "No se pudo enviar imagen por WhatsApp Web",
    });
  }
});

app.post("/send-audio", auth, async (req, res) => {
  const { channelId, to, jid, mediaUrl, mimeType, ptt } = req.body ?? {};
  if (!channelId) return res.status(400).json({ error: "channelId requerido" });

  let validatedUrl;
  try {
    validatedUrl = validateMediaUrl(mediaUrl);
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : "mediaUrl inválida",
    });
  }

  let session;
  try {
    session = await getConnectedSession(channelId);
  } catch (err) {
    const mapped = mapOutboundSessionError(err, res);
    if (mapped) return mapped;
    throw err;
  }

  try {
    const targetJid = await resolveSendJid(session, { to, jid });
    const { buffer, mimeType: fetchedMime } = await fetchAudioFromUrl(validatedUrl);
    const wantPtt = ptt !== false;
    let resolvedMime;
    try {
      resolvedMime =
        typeof mimeType === "string" && mimeType.trim()
          ? assertAllowedInboundAudioMime(mimeType, wantPtt)
          : fetchedMime;
    } catch {
      resolvedMime = fetchedMime;
    }

    const prepared = await prepareWhatsAppAudio(buffer, resolvedMime, wantPtt);

    log.info(
      {
        channelId,
        targetJid,
        inputJid: jid,
        to,
        bytesIn: buffer.length,
        bytesOut: prepared.buffer.length,
        mimeType: prepared.mimeType,
        ptt: prepared.ptt,
        transcoded: prepared.mimeType !== resolvedMime,
      },
      "enviando audio QR",
    );

    const sent = await session.sock.sendMessage(targetJid, {
      audio: prepared.buffer,
      mimetype: prepared.mimeType,
      ptt: prepared.ptt,
    });
    if (sent?.message) rememberMessage(sent);
    res.json({ id: sent?.key?.id ?? `out-${Date.now()}`, jid: targetJid });
  } catch (err) {
    log.error({ err, channelId, to, jid, mediaUrl: validatedUrl }, "send-audio falló");
    res.status(502).json({
      error: err instanceof Error ? err.message : "No se pudo enviar audio por WhatsApp Web",
    });
  }
});

app.post("/test-webhook", auth, async (req, res) => {
  const { channelId } = req.body ?? {};
  if (!channelId) return res.status(400).json({ error: "channelId requerido" });

  const sessionId = `bridge-${channelId}`;
  let session = sessions.get(sessionId);
  if (!session && hasPersistedCreds(channelId)) {
    session = bootstrapSession(channelId);
  }
  if (!session) {
    return res.status(404).json({ error: "Sesión no encontrada" });
  }

  await notifyDuMo(session, { type: "ping" });
  res.json({
    ok: session.lastWebhookStatus >= 200 && session.lastWebhookStatus < 300,
    lastWebhookStatus: session.lastWebhookStatus,
    lastWebhookError: session.lastWebhookError,
    webhookConfigured: Boolean(session.webhookUrl && session.webhookSecret),
  });
});

app.post("/debug/supabase-audio-upload", auth, async (req, res) => {
  const { audioUrl, phone = "57000000000", ptt = false } = req.body ?? {};

  if (!isSupabaseStorageConfigured()) {
    return res.status(503).json({
      error: "Supabase Storage no configurado en el bridge.",
      storage: getSupabaseStorageStatus(),
    });
  }

  try {
    let buffer;
    let mimeType;
    if (audioUrl) {
      const validatedUrl = validateMediaUrl(audioUrl);
      ({ buffer, mimeType } = await fetchAudioFromUrl(validatedUrl));
    } else {
      buffer = Buffer.from(
        "OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00",
        "binary",
      );
      mimeType = assertAllowedInboundAudioMime("audio/ogg; codecs=opus", Boolean(ptt));
    }

    const assetId = newMediaAssetId();
    const extension = extensionFromAudioMime(mimeType);
    const uploaded = await uploadInboundAudioToSupabase({
      phone: String(phone).replace(/\D/g, "") || "57000000000",
      assetId,
      extension,
      data: buffer,
      contentType: mimeType,
    });

    res.json({
      ok: true,
      publicUrl: uploaded.publicUrl,
      storagePath: uploaded.storagePath,
      mimeType,
      bytes: buffer.length,
      phone: String(phone).replace(/\D/g, "") || "57000000000",
    });
  } catch (err) {
    log.error({ err, audioUrl }, "debug supabase-audio-upload falló");
    res.status(502).json({
      error: err instanceof Error ? err.message : "No se pudo subir audio de prueba",
    });
  }
});

app.get("/health", (_req, res) => {
  const persistedChannelIds = listPersistedChannelIds();
  res.json({
    ok: true,
    sessions: sessions.size,
    persistedSessions: persistedChannelIds.length,
    persistedChannelIds,
    sessionsDir: SESSIONS_DIR,
    webhookEnvConfigured: Boolean(
      (process.env.DUMO_WEBHOOK_URL ?? "").trim() && (process.env.DUMO_WEBHOOK_SECRET ?? "").trim(),
    ),
    supabaseStorage: getSupabaseStorageStatus(),
    inboundAudioEnabled: isSupabaseStorageConfigured(),
    inboundImageEnabled: isSupabaseStorageConfigured(),
    active: [...sessions.values()].map((s) => ({
      channelId: s.channelId,
      status: s.status,
      hasQr: Boolean(s.qrDataUrl),
      lastError: s.lastError ?? null,
      webhookConfigured: Boolean(s.webhookUrl && s.webhookSecret),
      lastWebhookStatus: s.lastWebhookStatus ?? null,
      lastWebhookError: s.lastWebhookError ?? null,
      lastWebhookAt: s.lastWebhookAt ?? null,
    })),
  });
});

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("join", (sessionId) => {
    if (typeof sessionId === "string") socket.join(sessionId);
    const session = sessions.get(sessionId);
    if (session?.qrDataUrl) socket.emit("qr", { qrDataUrl: session.qrDataUrl });
    if (session?.status === "CONNECTED") {
      socket.emit("connected", { phoneNumber: session.phoneNumber });
    }
  });
});

httpServer.listen(PORT, () => {
  log.info(`Web QR Bridge escuchando en :${PORT}`);
  restorePersistedSessions();
});

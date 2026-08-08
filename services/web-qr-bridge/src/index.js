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
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
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
    if (remoteJid.endsWith("@lid")) {
      senderJid = remoteJid;
    } else {
      senderJid = remoteJidAlt;
    }
  } else if (String(senderPn).includes("@s.whatsapp.net")) {
    const pnDigits = digitsFromJid(senderPn);
    if (pnDigits.length >= 8 && pnDigits.length <= 13) {
      fromDigits = pnDigits;
      senderJid = senderPn;
    }
  }

  if (!senderJid && remoteJid) senderJid = remoteJid;

  return { from: fromDigits, senderJid: senderJid || undefined };
}

function extractMessageText(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    m.buttonsResponseMessage?.selectedDisplayText ??
    m.listResponseMessage?.title ??
    m.templateButtonReplyMessage?.selectedDisplayText ??
    ""
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
  };
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

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["DuMo CRM", "Chrome", "120.0.0"],
    connectTimeoutMs: 60_000,
  });

  session.sock = sock;
  session.status = "INITIALIZING";

  sock.ev.on("creds.update", saveCreds);

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

      const remoteJid = msg.key.remoteJid ?? "";
      if (shouldSkipInboundJid(remoteJid)) continue;

      const ts = Number(msg.messageTimestamp ?? 0);
      if (type === "append" && ts && nowSec - ts > 120) continue;

      const { from, senderJid } = extractInboundSender(msg);
      if (!from && !senderJid) {
        log.warn({ channelId: session.channelId, remoteJid, type }, "mensaje QR sin remitente");
        continue;
      }

      const text = extractMessageText(msg);
      const isImage = Boolean(msg.message?.imageMessage);

      await notifyDuMo(session, {
        type: "message.inbound",
        payload: {
          channelId: session.channelId,
          from,
          senderJid,
          messageId: msg.key.id ?? `qr-${Date.now()}`,
          timestamp: ts || nowSec,
          type: isImage ? "image" : "text",
          text: text || undefined,
          customerName: msg.pushName ?? "",
        },
      });
      log.info(
        { channelId: session.channelId, from, senderJid, messageId: msg.key.id, upsertType: type },
        "mensaje QR reenviado a DuMo",
      );
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

function resolveTargetJid({ to, jid }) {
  if (typeof jid === "string" && jid.includes("@")) return jid;
  const digits = String(to ?? jid ?? "").replace(/\D/g, "");
  if (!digits) throw new Error("Destino inválido");
  if (digits.length >= 14) return `${digits}@lid`;
  return `${digits}@s.whatsapp.net`;
}

app.post("/send", auth, async (req, res) => {
  const { channelId, to, jid, text } = req.body ?? {};
  if (!channelId) return res.status(400).json({ error: "channelId requerido" });

  const sessionId = `bridge-${channelId}`;
  let session = sessions.get(sessionId);

  if (!session && hasPersistedCreds(channelId)) {
    session = bootstrapSession(channelId);
  }

  if (session && !session.sock && session.status !== "QR_PENDING") {
    startBaileys(session).catch((err) => {
      session.lastError = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId }, "startBaileys en /send falló");
    });
  }

  if (session && session.status !== "CONNECTED") {
    const connected = await waitForConnected(session, 20);
    if (!connected && session.status === "QR_PENDING") {
      return res.status(503).json({
        error: "Sesión requiere escanear QR de nuevo",
      });
    }
  }

  if (!session?.sock) {
    return res.status(503).json({ error: "Sesión no conectada" });
  }

  try {
    const targetJid = resolveTargetJid({ to, jid });
    const sent = await session.sock.sendMessage(targetJid, { text: text ?? "" });
    res.json({ id: sent?.key?.id ?? `out-${Date.now()}`, jid: targetJid });
  } catch (err) {
    log.error({ err, channelId, to, jid }, "sendMessage falló");
    res.status(502).json({
      error: err instanceof Error ? err.message : "No se pudo enviar por WhatsApp Web",
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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    sessions: sessions.size,
    webhookEnvConfigured: Boolean(
      (process.env.DUMO_WEBHOOK_URL ?? "").trim() && (process.env.DUMO_WEBHOOK_SECRET ?? "").trim(),
    ),
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

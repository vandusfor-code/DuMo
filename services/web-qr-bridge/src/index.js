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
  if (!session.webhookUrl || !session.webhookSecret) return;
  try {
    await fetch(session.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Web-Qr-Webhook-Secret": session.webhookSecret,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    log.error({ err, channelId: session.channelId }, "webhook DuMo falló");
  }
}

function digitsFromJid(jid) {
  if (!jid || typeof jid !== "string") return "";
  return (jid.split("@")[0] ?? "").replace(/\D/g, "");
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

function hasPersistedCreds(channelId) {
  return fs.existsSync(path.join(SESSIONS_DIR, channelId, "creds.json"));
}

function createSessionRuntime(channelId, overrides = {}) {
  const sessionId = `bridge-${channelId}`;
  return {
    sessionId,
    channelId,
    label: overrides.label ?? channelId,
    webhookUrl: overrides.webhookUrl ?? process.env.DUMO_WEBHOOK_URL ?? "",
    webhookSecret: overrides.webhookSecret ?? process.env.DUMO_WEBHOOK_SECRET ?? "",
    status: "INITIALIZING",
    qrDataUrl: null,
    phoneNumber: null,
    sock: null,
    lastError: null,
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
      session.status = "CONNECTED";
      session.qrDataUrl = null;
      const jid = sock.user?.id ?? "";
      session.phoneNumber = jid.split("@")[0]?.replace(/\D/g, "") ?? null;
      await notifyDuMo(session, {
        type: "session.connected",
        channelId: session.channelId,
        phoneNumber: session.phoneNumber,
        sessionData: { connectedAt: new Date().toISOString() },
      });
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
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const { from, senderJid } = extractInboundSender(msg);
      if (!from && !senderJid) continue;

      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        msg.message?.imageMessage?.caption ??
        "";

      await notifyDuMo(session, {
        type: "message.inbound",
        payload: {
          channelId: session.channelId,
          from,
          senderJid,
          messageId: msg.key.id ?? `qr-${Date.now()}`,
          timestamp: Number(msg.messageTimestamp ?? Math.floor(Date.now() / 1000)),
          type: msg.message?.imageMessage ? "image" : "text",
          text: text || undefined,
          customerName: msg.pushName ?? "",
        },
      });
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
  let session = sessions.get(sessionId);
  if (!session) {
    log.info({ channelId }, "nueva sesión Baileys");
    session = createSessionRuntime(channelId, {
      label: label ?? channelId,
      webhookUrl: webhookUrl ?? process.env.DUMO_WEBHOOK_URL ?? "",
      webhookSecret: webhookSecret ?? process.env.DUMO_WEBHOOK_SECRET ?? "",
    });
    sessions.set(sessionId, session);
    startBaileys(session).catch((err) => {
      session.lastError = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId }, "startBaileys falló");
    });
  } else if (!session.sock && session.status !== "QR_PENDING") {
    log.info({ channelId }, "reiniciando sesión Baileys en memoria");
    startBaileys(session).catch((err) => {
      session.lastError = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId }, "startBaileys falló");
    });
  }

  res.json({
    sessionId,
    status: session.status,
    qrDataUrl: session.qrDataUrl ?? undefined,
    phoneNumber: session.phoneNumber ?? undefined,
    lastError: session.lastError ?? undefined,
  });
});

app.get("/sessions/:sessionId", auth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    sessions: sessions.size,
    active: [...sessions.values()].map((s) => ({
      channelId: s.channelId,
      status: s.status,
      hasQr: Boolean(s.qrDataUrl),
      lastError: s.lastError ?? null,
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

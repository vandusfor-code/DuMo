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

async function startBaileys(session) {
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
      await notifyDuMo(session, { type: "session.disconnected", channelId: session.channelId });

      if (code !== DisconnectReason.loggedOut) {
        log.info({ channelId: session.channelId, code }, "reconectando Baileys…");
        setTimeout(() => startBaileys(session).catch((e) => log.error(e)), 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const from = msg.key.remoteJid?.replace("@s.whatsapp.net", "").replace(/\D/g, "");
      if (!from) continue;

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
          messageId: msg.key.id ?? `qr-${Date.now()}`,
          timestamp: Number(msg.messageTimestamp ?? Math.floor(Date.now() / 1000)),
          type: msg.message?.imageMessage ? "image" : "text",
          text: text || undefined,
          customerName: msg.pushName ?? "",
        },
      });
    }
  });
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
    session = {
      sessionId,
      channelId,
      label: label ?? channelId,
      webhookUrl: webhookUrl ?? process.env.DUMO_WEBHOOK_URL ?? "",
      webhookSecret: webhookSecret ?? process.env.DUMO_WEBHOOK_SECRET ?? "",
      status: "INITIALIZING",
      qrDataUrl: null,
      phoneNumber: null,
      sock: null,
      lastError: null,
    };
    sessions.set(sessionId, session);
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
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Sesión no encontrada" });
  try {
    await session.sock?.logout();
  } catch {
    /* ya desconectado */
  }
  session.status = "DISCONNECTED";
  session.sock = null;
  res.json({ ok: true });
});

app.post("/send", auth, async (req, res) => {
  const { channelId, to, text } = req.body ?? {};
  const sessionId = `bridge-${channelId}`;
  const session = sessions.get(sessionId);
  if (!session?.sock) return res.status(503).json({ error: "Sesión no conectada" });

  const jid = `${String(to).replace(/\D/g, "")}@s.whatsapp.net`;
  const sent = await session.sock.sendMessage(jid, { text: text ?? "" });
  res.json({ id: sent?.key?.id ?? `out-${Date.now()}` });
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
});

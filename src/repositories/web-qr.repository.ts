import "server-only";
import type postgres from "postgres";
import { ensureSchema, getSql, withDbRetry, withQueryTimeout } from "@/server/db/client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type { WebQrSession, WhatsAppChannel } from "@/server/web-qr/types";

type ChannelRow = {
  id: string;
  company_id: string;
  phone_number: string;
  label: string;
  channel_type: string;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type SessionRow = {
  id: string;
  channel_id: string;
  session_data: Record<string, unknown>;
  browser_user_agent: string;
  bridge_session_id: string | null;
  last_reconnect_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function mapChannel(row: ChannelRow): WhatsAppChannel {
  return {
    id: row.id,
    companyId: row.company_id,
    phoneNumber: row.phone_number,
    label: row.label,
    channelType: row.channel_type as WhatsAppChannel["channelType"],
    status: row.status as WhatsAppChannel["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSession(row: SessionRow): WebQrSession {
  return {
    id: row.id,
    channelId: row.channel_id,
    sessionData: row.session_data ?? {},
    browserUserAgent: row.browser_user_agent ?? "",
    bridgeSessionId: row.bridge_session_id,
    lastReconnectAt: row.last_reconnect_at ? String(row.last_reconnect_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const webQrRepository = {
  async listWebQrChannels(companyId = DEFAULT_COMPANY_ID): Promise<WhatsAppChannel[]> {
    await ensureSchema();
    const sql = getSql()!;
    const rows = await withQueryTimeout(
      withDbRetry(() => sql`
        SELECT id, company_id, phone_number, label, channel_type, status, created_at, updated_at
        FROM whatsapp_channels
        WHERE company_id = ${companyId} AND channel_type = 'WEB_QR'
        ORDER BY created_at DESC
      `),
      8000,
    );
    return (rows as unknown as ChannelRow[]).map(mapChannel);
  },

  async getChannel(id: string): Promise<WhatsAppChannel | null> {
    await ensureSchema();
    const sql = getSql()!;
    const rows = (await sql`
      SELECT id, company_id, phone_number, label, channel_type, status, created_at, updated_at
      FROM whatsapp_channels WHERE id = ${id} LIMIT 1
    `) as unknown as ChannelRow[];
    return rows[0] ? mapChannel(rows[0]) : null;
  },

  async createWebQrChannel(input: {
    id: string;
    label: string;
    phoneNumber?: string;
    companyId?: string;
  }): Promise<WhatsAppChannel> {
    await ensureSchema();
    const sql = getSql()!;
    const companyId = input.companyId ?? DEFAULT_COMPANY_ID;
    const phone = (input.phoneNumber ?? "").replace(/\D/g, "") || "pending";

    await sql`
      INSERT INTO whatsapp_channels (id, company_id, phone_number, label, channel_type, status)
      VALUES (${input.id}, ${companyId}, ${phone}, ${input.label}, 'WEB_QR', 'INITIALIZING')
    `;

    await sql`
      INSERT INTO web_qr_sessions (id, channel_id, session_data)
      VALUES (${`sess-${input.id}`}, ${input.id}, '{}'::jsonb)
    `;

    const channel = await this.getChannel(input.id);
    if (!channel) throw new Error("No se pudo crear el canal QR.");
    return channel;
  },

  async updateChannelStatus(id: string, status: WhatsAppChannel["status"], phoneNumber?: string): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    if (phoneNumber) {
      await sql`
        UPDATE whatsapp_channels
        SET status = ${status}, phone_number = ${phoneNumber.replace(/\D/g, "")}, updated_at = now()
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE whatsapp_channels SET status = ${status}, updated_at = now() WHERE id = ${id}
      `;
    }
  },

  async getSessionByChannel(channelId: string): Promise<WebQrSession | null> {
    await ensureSchema();
    const sql = getSql()!;
    const rows = (await sql`
      SELECT id, channel_id, session_data, browser_user_agent, bridge_session_id,
             last_reconnect_at, created_at, updated_at
      FROM web_qr_sessions WHERE channel_id = ${channelId} LIMIT 1
    `) as unknown as SessionRow[];
    return rows[0] ? mapSession(rows[0]) : null;
  },

  async updateSessionBridge(input: {
    channelId: string;
    bridgeSessionId: string;
    sessionData?: Record<string, unknown>;
  }): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    const bridgeId = input.bridgeSessionId || null;
    if (input.sessionData !== undefined) {
      await sql`
        UPDATE web_qr_sessions
        SET bridge_session_id = ${bridgeId},
            session_data = ${sql.json(input.sessionData as postgres.JSONValue)},
            last_reconnect_at = now(),
            updated_at = now()
        WHERE channel_id = ${input.channelId}
      `;
    } else {
      await sql`
        UPDATE web_qr_sessions
        SET bridge_session_id = ${bridgeId},
            last_reconnect_at = now(),
            updated_at = now()
        WHERE channel_id = ${input.channelId}
      `;
    }
  },

  async saveSessionData(channelId: string, sessionData: Record<string, unknown>): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    await sql`
      UPDATE web_qr_sessions
      SET session_data = ${sql.json(sessionData as postgres.JSONValue)}, updated_at = now()
      WHERE channel_id = ${channelId}
    `;
  },
};

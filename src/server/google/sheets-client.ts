import "server-only";
import { google, type sheets_v4 } from "googleapis";
import { getGoogleConfig, type GoogleConfig } from "./config";
import {
  CONFIG_KEYS,
  DEFAULT_CONFIG,
  DEFAULT_PLANS,
  SHEET_SCHEMA,
  type TabName,
} from "./schema";

export interface ProvisionResult {
  createdTabs: TabName[];
  createdHeaders: TabName[];
  seededConfig: boolean;
  seededPlans: boolean;
}

/**
 * Reusable, server-only Google Sheets client. Every repository consumes this
 * single instance. Responsibilities:
 *   - authenticate with the service account (JWT)
 *   - lazily provision the spreadsheet schema (tabs + headers) once per runtime
 *   - expose small, typed read/write helpers on top of the raw Sheets API
 *
 * The spreadsheet is the database; this class is the only place that talks to
 * it, so swapping storage later means replacing just this file's consumers.
 */
export class GoogleSheetsClient {
  private readonly sheets: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private provisionPromise: Promise<ProvisionResult> | null = null;
  private headerCache = new Map<TabName, string[]>();

  constructor(config: GoogleConfig) {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = config.sheetId;
  }

  /**
   * Ensures every tab and header row exists. Cached per runtime so concurrent
   * requests share one provisioning round-trip (Vercel cold-start friendly).
   */
  ensureProvisioned(): Promise<ProvisionResult> {
    if (!this.provisionPromise) {
      this.provisionPromise = this.provision().catch((err) => {
        // Reset so a transient failure can be retried on the next request.
        this.provisionPromise = null;
        throw err;
      });
    }
    return this.provisionPromise;
  }

  private async provision(): Promise<ProvisionResult> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties.title",
    });
    const existing = new Set(
      (meta.data.sheets ?? [])
        .map((s) => s.properties?.title)
        .filter((t): t is string => Boolean(t)),
    );

    // 1) Create any missing tabs in a single batch.
    const missingTabs = SHEET_SCHEMA.filter((t) => !existing.has(t.name));
    if (missingTabs.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: missingTabs.map((t) => ({
            addSheet: { properties: { title: t.name } },
          })),
        },
      });
    }

    // 2) Read the first row of every tab to detect missing headers.
    const batch = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: SHEET_SCHEMA.map((t) => `${t.name}!1:1`),
    });
    const firstRows = batch.data.valueRanges ?? [];

    const headerData: sheets_v4.Schema$ValueRange[] = [];
    const createdHeaders: TabName[] = [];
    SHEET_SCHEMA.forEach((tab, i) => {
      const current = firstRows[i]?.values?.[0] ?? [];
      const hasHeaders = current.length > 0;
      if (!hasHeaders) {
        // Header missing -> write it. Never touched if it already exists, so
        // headers are never duplicated.
        headerData.push({ range: `${tab.name}!A1`, values: [tab.headers] });
        createdHeaders.push(tab.name);
      }
      this.headerCache.set(tab.name, hasHeaders ? current : tab.headers);
    });

    if (headerData.length > 0) {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { valueInputOption: "RAW", data: headerData },
      });
    }

    // 3) Seed default configuration if the Configuracion tab is empty.
    let seededConfig = false;
    const configWasCreated =
      missingTabs.some((t) => t.name === "Configuracion") ||
      createdHeaders.includes("Configuracion");
    if (configWasCreated) {
      const rows = Object.entries(DEFAULT_CONFIG).map(([clave, valor]) => [
        clave,
        valor,
      ]);
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: "Configuracion!A1",
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: rows },
        });
        seededConfig = true;
      }
    }

    // 4) Seed default plans if the Planes tab is empty.
    let seededPlans = false;
    const plansWasCreated =
      missingTabs.some((t) => t.name === "Planes") ||
      createdHeaders.includes("Planes");
    if (plansWasCreated && DEFAULT_PLANS.length > 0) {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "Planes!A1",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: DEFAULT_PLANS.map(([id, nombre]) => [id, nombre]) },
      });
      seededPlans = true;
    }

    return {
      createdTabs: missingTabs.map((t) => t.name),
      createdHeaders,
      seededConfig,
      seededPlans,
    };
  }

  /** Actual header order for a tab (read from the sheet, cached). */
  private async getHeaders(tab: TabName): Promise<string[]> {
    const cached = this.headerCache.get(tab);
    if (cached) return cached;
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!1:1`,
    });
    const headers =
      res.data.values?.[0] ??
      SHEET_SCHEMA.find((t) => t.name === tab)?.headers ??
      [];
    this.headerCache.set(tab, headers as string[]);
    return headers as string[];
  }

  /** All data rows of a tab as header-keyed records. */
  async getRecords(tab: TabName): Promise<Record<string, string>[]> {
    await this.ensureProvisioned();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: tab,
    });
    const values = res.data.values ?? [];
    if (values.length < 2) return [];
    const [headers, ...rows] = values;
    return rows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[String(h)] = row[i] != null ? String(row[i]) : "";
      });
      return record;
    });
  }

  /** Append a single record; values are ordered to match the sheet headers. */
  async appendRecord(tab: TabName, record: Record<string, string>): Promise<void> {
    await this.appendRecords(tab, [record]);
  }

  /** Append many records in one round-trip. */
  async appendRecords(
    tab: TabName,
    records: Record<string, string>[],
  ): Promise<void> {
    if (records.length === 0) return;
    await this.ensureProvisioned();
    const headers = await this.getHeaders(tab);
    const values = records.map((record) =>
      headers.map((h) => record[h] ?? ""),
    );
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  }

  /** Configuration as a key/value map from the Configuracion tab. */
  async getConfigMap(): Promise<Record<string, string>> {
    const records = await this.getRecords("Configuracion");
    const map: Record<string, string> = {};
    for (const r of records) {
      if (r.clave) map[r.clave] = r.valor ?? "";
    }
    return map;
  }

  /** Append an entry to the Logs tab. Best-effort — never throws to callers. */
  async log(
    level: "info" | "warn" | "error",
    message: string,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.appendRecord("Logs", {
        id: crypto.randomUUID(),
        fecha: new Date().toISOString(),
        nivel: level,
        mensaje: message,
        contexto: JSON.stringify(context),
      });
    } catch {
      // Logging must never break the primary operation.
    }
  }
}

let clientSingleton: GoogleSheetsClient | null = null;

/**
 * Returns the shared client, or `null` when credentials are absent (dev mode).
 * The singleton is memoised across warm invocations on Vercel.
 */
export function getSheetsClient(): GoogleSheetsClient | null {
  if (clientSingleton) return clientSingleton;
  const config = getGoogleConfig();
  if (!config) return null;
  clientSingleton = new GoogleSheetsClient(config);
  return clientSingleton;
}

export { CONFIG_KEYS };

import "server-only";
import type { MediaAsset, MediaKind, MediaSource } from "@/types/media";
import {
  ensureSchema,
  getSql,
  hasDatabase,
  resetSchemaCache,
  withDbRetry,
} from "@/server/db/client";

export interface MediaRepository {
  create(input: Omit<MediaAsset, "createdAt"> & { createdAt?: string }): Promise<MediaAsset>;
  findById(companyId: string, id: string): Promise<MediaAsset | null>;
}

function mapMediaRow(r: Record<string, unknown>): MediaAsset {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    bucket: String(r.bucket),
    storagePath: String(r.storage_path),
    publicUrl: String(r.public_url),
    fileName: String(r.file_name),
    mimeType: String(r.mime_type),
    sizeBytes: Number(r.size_bytes) || 0,
    mediaKind: String(r.media_kind) as MediaKind,
    source: String(r.source) as MediaSource,
    waMediaId: r.wa_media_id ? String(r.wa_media_id) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    createdBy: r.created_by ? String(r.created_by) : null,
  };
}

class PostgresMediaRepository implements MediaRepository {
  async create(input: Omit<MediaAsset, "createdAt"> & { createdAt?: string }): Promise<MediaAsset> {
    await ensureSchema();
    const sql = getSql()!;
    const createdAt = input.createdAt ?? new Date().toISOString();
    try {
      await withDbRetry(() =>
        sql`
        INSERT INTO media_assets (
          id, company_id, bucket, storage_path, public_url, file_name,
          mime_type, size_bytes, media_kind, source, wa_media_id, created_at, created_by
        ) VALUES (
          ${input.id}, ${input.companyId}, ${input.bucket}, ${input.storagePath},
          ${input.publicUrl}, ${input.fileName}, ${input.mimeType}, ${input.sizeBytes},
          ${input.mediaKind}, ${input.source}, ${input.waMediaId ?? null},
          ${createdAt}, ${input.createdBy ?? null}
        )
      `,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("media_assets") && msg.includes("does not exist")) {
        resetSchemaCache();
        await ensureSchema();
        await withDbRetry(() =>
          sql`
            INSERT INTO media_assets (
              id, company_id, bucket, storage_path, public_url, file_name,
              mime_type, size_bytes, media_kind, source, wa_media_id, created_at, created_by
            ) VALUES (
              ${input.id}, ${input.companyId}, ${input.bucket}, ${input.storagePath},
              ${input.publicUrl}, ${input.fileName}, ${input.mimeType}, ${input.sizeBytes},
              ${input.mediaKind}, ${input.source}, ${input.waMediaId ?? null},
              ${createdAt}, ${input.createdBy ?? null}
            )
          `,
        );
      } else {
        throw err;
      }
    }
    const row = await this.findById(input.companyId, input.id);
    if (!row) throw new Error("No se pudo registrar el archivo.");
    return row;
  }

  async findById(companyId: string, id: string): Promise<MediaAsset | null> {
    await ensureSchema();
    const sql = getSql()!;
    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM media_assets
        WHERE company_id = ${companyId} AND id = ${id}
        LIMIT 1
      `,
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? mapMediaRow(row) : null;
  }
}

class MockMediaRepository implements MediaRepository {
  private items = new Map<string, MediaAsset>();

  async create(input: Omit<MediaAsset, "createdAt"> & { createdAt?: string }): Promise<MediaAsset> {
    const asset: MediaAsset = {
      ...input,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.items.set(`${input.companyId}:${input.id}`, asset);
    return asset;
  }

  async findById(companyId: string, id: string): Promise<MediaAsset | null> {
    return this.items.get(`${companyId}:${id}`) ?? null;
  }
}

export function getMediaRepository(): MediaRepository {
  return hasDatabase() ? new PostgresMediaRepository() : new MockMediaRepository();
}

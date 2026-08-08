import { NextResponse, type NextRequest } from "next/server";
import {
  getDatabaseUrl,
  hasDatabase,
  inspectDatabaseUrlPooler,
  migrateDatabaseSchema,
} from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(request: NextRequest): boolean {
  const secret = process.env.MIGRATE_DB_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("x-migrate-db-secret")?.trim();
  const query = request.nextUrl.searchParams.get("secret")?.trim();
  return header === secret || query === secret;
}

/** POST — aplica migraciones DDL. Solo CI/deploy (MIGRATE_DB_SECRET). */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL1 no configurada." }, { status: 503 });
  }

  const poolerWarnings = inspectDatabaseUrlPooler(getDatabaseUrl());
  try {
    const result = await migrateDatabaseSchema();
    return NextResponse.json({
      ...result,
      poolerWarnings,
    });
  } catch (error) {
    console.error("[POST /api/system/migrate]", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        poolerWarnings,
      },
      { status: 500 },
    );
  }
}

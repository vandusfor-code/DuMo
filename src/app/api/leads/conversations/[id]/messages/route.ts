import { NextResponse } from "next/server";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const messages = await Promise.race([
      leadsService.getMessages(id),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Messages timeout")), 12_000),
      ),
    ]);
    return NextResponse.json(messages);
  } catch (error) {
    console.error(`[GET /api/leads/conversations/${id}/messages]`, error);
    return NextResponse.json([]);
  }
}

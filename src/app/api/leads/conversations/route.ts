import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    const user = await authService.getSessionUser();
    const advisorId = user?.role === "asesora" ? user.id : undefined;

    if (advisorId) {
      const { adminLeadsService } = await import("@/services/admin-leads.service");
      await Promise.race([
        adminLeadsService.autoAssignAllPending(),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    }

    const conversations = await Promise.race([
      leadsService.getConversations(advisorId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Conversations timeout")), 12_000),
      ),
    ]);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[GET /api/leads/conversations]", error);
    return NextResponse.json([]);
  }
}

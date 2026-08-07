import "server-only";
import { getQuickReplyRepository } from "@/repositories/quick-reply.repository";
import { mediaService } from "@/services/media.service";
import { leadsService } from "@/services/leads.service";
import { quickReplyService } from "@/services/quick-reply.service";
import { isSingleTextTemplate } from "@/lib/quick-reply-utils";
import { renderTemplate } from "@/lib/sales-script/render";
import type { TenantScope } from "@/lib/tenant-scope";

const SEND_GAP_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const quickReplySendService = {
  async sendTemplate(input: {
    scope: TenantScope;
    templateId: string;
    conversationId: string;
    to: string;
    customerName?: string;
  }): Promise<{ mode: "insert" | "sent"; text?: string; sentCount?: number }> {
    const templates = await getQuickReplyRepository().listAdvisorTemplates(input.scope.companyId);
    const template = templates.find((t) => t.id === input.templateId);
    if (!template) throw new Error("Plantilla no encontrada o inactiva.");

    const items = template.items ?? [];
    if (isSingleTextTemplate(items)) {
      const text = renderTemplate(items[0]?.textBody ?? "", {
        asesor: input.scope.userName,
        cliente: input.customerName ?? "",
      });
      return { mode: "insert", text };
    }

    let sentCount = 0;
    for (const item of items.sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (item.itemKind === "text" && item.textBody?.trim()) {
        const text = renderTemplate(item.textBody, {
          asesor: input.scope.userName,
          cliente: input.customerName ?? "",
        });
        await leadsService.sendTextMessage({
          conversationId: input.conversationId,
          to: input.to,
          text,
          companyId: input.scope.companyId,
        });
        sentCount++;
      } else if (item.itemKind === "media" && item.mediaAssetId) {
        const asset = await mediaService.findById(input.scope.companyId, item.mediaAssetId);
        if (!asset) continue;
        await leadsService.sendMediaMessage({
          conversationId: input.conversationId,
          to: input.to,
          mediaAssetId: asset.id,
          mediaUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          caption: item.caption ?? undefined,
          companyId: input.scope.companyId,
        });
        sentCount++;
      }
      await sleep(SEND_GAP_MS);
    }

    await quickReplyService.trackUsage(input.scope, input.templateId);
    return { mode: "sent", sentCount };
  },
};

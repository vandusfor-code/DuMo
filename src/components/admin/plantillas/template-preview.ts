import type { QuickReplyTemplate } from "@/types/quick-reply";

export function getTemplatePreview(template: QuickReplyTemplate): string {
  const items = template.activeVersion?.items ?? [];
  const textItem = items.find((i) => i.itemKind === "text");
  const mediaItem = items.find((i) => i.itemKind === "media");
  return (
    textItem?.textBody?.slice(0, 200) ??
    mediaItem?.caption?.slice(0, 200) ??
    (mediaItem ? "Plantilla con imagen" : "")
  );
}

export function getTemplateItemCount(template: QuickReplyTemplate): number {
  return template.activeVersion?.items?.length ?? 0;
}

import type { QuickReplyTemplateItem } from "@/types/quick-reply";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeShortcut(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed.toLowerCase() : `/${trimmed.toLowerCase()}`;
}

/** Una sola fila de texto → insertar en composer. */
export function isSingleTextTemplate(items: QuickReplyTemplateItem[]): boolean {
  return items.length === 1 && items[0]?.itemKind === "text";
}

export function templatePreviewText(items: QuickReplyTemplateItem[]): string | undefined {
  const textItem = items.find((i) => i.itemKind === "text" && i.textBody?.trim());
  return textItem?.textBody?.trim().slice(0, 120);
}

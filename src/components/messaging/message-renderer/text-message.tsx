"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/conversation";

/** *negrita*, _cursiva_, ~tachado~ — la sintaxis que WhatsApp interpreta en el teléfono del cliente. */
const WHATSAPP_FORMAT_RE = /\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g;

/**
 * DuMo guarda y envía el texto tal cual (con los asteriscos/guiones bajos
 * literales) — es WhatsApp quien los interpreta como negrita/cursiva en el
 * teléfono del cliente. Sin esto, la vista de DuMo mostraba los símbolos
 * sueltos en vez del texto formateado, aunque el cliente sí lo veía bien.
 */
function renderWhatsAppFormatting(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(WHATSAPP_FORMAT_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      nodes.push(<del key={key++}>{match[3]}</del>);
    }
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function TextMessage({ message }: { message: ChatMessage }) {
  if (message.link) {
    const out = message.direction === "out";
    return (
      <a href={message.link.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="flex items-center gap-3 rounded-xl bg-brand p-3 text-white">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/15 text-[13px] font-bold">
            DM
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{message.link.title}</p>
            <p className="truncate text-[12px] text-white/80">{message.link.description}</p>
          </div>
        </div>
        <p
          className={cn(
            "mt-1.5 truncate text-[13px] underline",
            out ? "text-white/90" : "text-brand",
          )}
        >
          {message.link.url}
        </p>
      </a>
    );
  }

  return <p className="whitespace-pre-line">{renderWhatsAppFormatting(message.text)}</p>;
}

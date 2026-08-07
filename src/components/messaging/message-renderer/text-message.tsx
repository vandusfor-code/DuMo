"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/conversation";

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

  return <p className="whitespace-pre-line">{message.text}</p>;
}

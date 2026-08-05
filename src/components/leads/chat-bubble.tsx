import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/conversation";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const out = message.direction === "out";

  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm",
          out
            ? "rounded-br-md bg-[#d9fdd3] text-ink shadow-sm"
            : "rounded-bl-md bg-white text-ink shadow-sm",
        )}
      >
        {message.link ? (
          <a
            href={message.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="flex items-center gap-3 rounded-xl bg-brand p-3 text-white">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/15 text-[13px] font-bold">
                DM
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{message.link.title}</p>
                <p className="truncate text-[12px] text-white/80">
                  {message.link.description}
                </p>
              </div>
            </div>
            <p className="mt-1.5 truncate text-[13px] text-brand underline">
              {message.link.url}
            </p>
          </a>
        ) : (
          <p className="whitespace-pre-line">{message.text}</p>
        )}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[11px]",
            out ? "text-muted" : "text-muted",
          )}
        >
          {message.time}
          {out &&
            (message.read ? (
              <CheckCheck className="size-3.5 text-[#53bdeb]" />
            ) : (
              <Check className="size-3.5" />
            ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatUiTheme } from "@/components/leads/premium/chat-theme";
import type { ChatMessage } from "@/types/conversation";

export function MessageShell({
  message,
  isMedia,
  children,
}: {
  message: ChatMessage;
  isMedia?: boolean;
  children: React.ReactNode;
}) {
  const out = message.direction === "out";
  const theme = useChatUiTheme();
  const premium = theme === "premium";

  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] text-[13px] leading-snug",
          premium ? "max-w-[72%]" : "",
          premium
            ? cn(
                "rounded-[12px] px-3 py-1.5",
                out
                  ? "rounded-br-[4px] border border-brand/15 bg-brand-soft text-brand"
                  : "rounded-bl-[4px] border border-msg-in/60 bg-msg-in text-msg-in-text",
                isMedia && "border-0 bg-transparent p-0",
              )
            : cn(
                "rounded-2xl px-3.5 py-2.5",
                out
                  ? "rounded-br-md bg-brand text-white shadow-sm"
                  : "rounded-bl-md border border-line bg-card text-ink shadow-sm",
                isMedia && "border-0 bg-transparent p-0 shadow-none",
              ),
        )}
      >
        {children}
        <div
          className={cn(
            "mt-0.5 flex items-center justify-end gap-1 text-[11px]",
            isMedia ? "px-1" : "",
            premium
              ? out
                ? "text-placeholder"
                : "text-placeholder"
              : out
                ? "text-white/70"
                : "text-muted",
          )}
        >
          {message.time}
          {out &&
            !isMedia &&
            (message.read ? (
              <CheckCheck className={cn("size-3.5", premium ? "text-brand" : "text-white/90")} />
            ) : (
              <Check className={cn("size-3.5", premium ? "text-muted" : "")} />
            ))}
        </div>
      </div>
    </div>
  );
}

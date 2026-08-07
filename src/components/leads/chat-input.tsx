"use client";

import { useState } from "react";
import { useSendMediaMessage, useSendMessage } from "@/hooks/use-leads";
import { useAdminSendMediaMessage, useAdminSendMessage } from "@/hooks/use-admin-leads";
import {
  TemplatePicker,
  useTemplatePickerState,
  useTemplateSend,
} from "@/components/messaging/template-picker";
import {
  ChatComposerControls,
  MediaAttachmentPreview,
  useMediaAttachment,
} from "@/components/messaging/chat-composer";
import { PinnedQuickReplies } from "@/components/leads/premium/pinned-quick-replies";
import type { ChatUiTheme } from "@/components/leads/premium/chat-theme";
import { cn } from "@/lib/utils";
import { isMessengerConversation } from "@/lib/messenger/conversation-id";

/**
 * Composer del chat. Envía texto e imágenes por la Cloud API; el mensaje
 * se persiste como saliente y la bandeja se refresca sola.
 */
export function ChatInput({
  conversationId,
  to,
  customerName,
  variant = "advisor",
  uiTheme = "default",
}: {
  conversationId: string;
  to: string;
  customerName?: string;
  variant?: "advisor" | "admin";
  uiTheme?: ChatUiTheme;
}) {
  const premium = uiTheme === "premium";
  const isMessenger = isMessengerConversation(conversationId);
  const [value, setValue] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const advisorSend = useSendMessage(conversationId);
  const advisorSendMedia = useSendMediaMessage(conversationId);
  const adminSend = useAdminSendMessage(conversationId);
  const adminSendMedia = useAdminSendMediaMessage(conversationId);
  const send = variant === "admin" ? adminSend : advisorSend;
  const sendMedia = variant === "admin" ? adminSendMedia : advisorSendMedia;
  const enableTemplates = variant === "advisor" && !premium;
  const showPinnedReplies = premium;
  const media = useMediaAttachment();
  const picker = useTemplatePickerState();
  const templateSend = useTemplateSend({
    conversationId,
    to,
    customerName,
    onInsertText: (text) => {
      setValue(text);
      picker.closePicker();
    },
    onSent: () => {
      setValue("");
      picker.closePicker();
    },
  });

  const isSending =
    send.isPending ||
    sendMedia.isPending ||
    (enableTemplates ? templateSend.isSending : false);
  const hasText = value.trim().length > 0;
  const hasAttachment = Boolean(media.attachment);

  const handleImageFile = (file: File) => {
    const type = file.type || "";
    const looksLikeImage =
      type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name || "");
    if (!looksLikeImage) return;
    media.setImageFile(file);
  };

  const submit = () => {
    if (isSending) return;

    if (media.attachment) {
      sendMedia.mutate(
        {
          to,
          file: media.attachment.file,
          caption: media.attachment.caption.trim() || undefined,
        },
        {
          onSuccess: () => {
            media.clearAttachment();
            setValue("");
          },
        },
      );
      return;
    }

    const text = value.trim();
    if (!text) return;
    send.mutate({ to, text }, { onSuccess: () => setValue("") });
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (enableTemplates) picker.onValueChange(next);
  };

  return (
    <div
      className={cn(
        "relative shrink-0 border-t border-line bg-card pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
        premium ? "px-4 py-3" : "px-4 py-3",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) setDragActive(false);
      }}
    >
      {enableTemplates ? (
        <TemplatePicker
          open={picker.pickerOpen}
          query={picker.slashQuery}
          onClose={picker.closePicker}
          onSelect={(t) => {
            void templateSend.handleSelect(t);
          }}
        />
      ) : null}

      {media.attachment ? (
        <MediaAttachmentPreview
          attachment={media.attachment}
          onCaptionChange={media.setCaption}
          onRemove={media.clearAttachment}
          disabled={isSending}
        />
      ) : null}

      {showPinnedReplies && !media.attachment ? (
        <PinnedQuickReplies
          conversationId={conversationId}
          to={to}
          customerName={customerName}
          disabled={isSending}
          onInsertText={(text) => setValue(text)}
          onSent={() => setValue("")}
        />
      ) : null}

      <ChatComposerControls
        hasText={hasText}
        hasAttachment={hasAttachment}
        isSending={isSending}
        onAttach={media.openFilePicker}
        onSubmit={submit}
        fileInputRef={media.fileInputRef}
        onFileSelected={handleImageFile}
        dragActive={dragActive}
        uiTheme={uiTheme}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) handleImageFile(file);
              break;
            }
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleImageFile(file);
        }}
      >
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              enableTemplates &&
              picker.pickerOpen &&
              (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")
            ) {
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            premium
              ? "Escribe un mensaje..."
              : enableTemplates
                ? "Escribe un mensaje o / para plantillas…"
                : "Escribe un mensaje..."
          }
          disabled={isSending}
          className={cn(
            "w-full border border-border-strong bg-card text-[14px] text-ink outline-none transition-all duration-150",
            "placeholder:text-placeholder focus:border-brand focus:shadow-[0_0_0_4px_rgba(124,58,237,0.08)] disabled:opacity-60",
            premium
              ? "h-[52px] rounded-[16px] px-4"
              : "h-11 rounded-full border-line bg-canvas px-4 focus-visible:border-brand",
          )}
        />
      </ChatComposerControls>

      {(send.isError || sendMedia.isError) && (
        <p className="mt-2 text-[12px] text-danger-ink">
          {send.error instanceof Error
            ? send.error.message
            : sendMedia.error instanceof Error
              ? sendMedia.error.message
              : isMessenger
                ? "No se pudo enviar. Revisa la configuración de Messenger."
                : "No se pudo enviar. Revisa la configuración de WhatsApp."}
        </p>
      )}
    </div>
  );
}

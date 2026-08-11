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
  useVoiceRecorder,
  VoiceRecordingIndicator,
} from "@/components/messaging/chat-composer";
import { PinnedQuickReplies } from "@/components/leads/premium/pinned-quick-replies";
import type { ChatUiTheme } from "@/components/leads/premium/chat-theme";
import { cn } from "@/lib/utils";
import { isMessengerConversation } from "@/lib/messenger/conversation-id";

/**
 * Composer del chat. Envía texto, imágenes y audios; el mensaje
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
  const canRecord = true;
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
  const voice = useVoiceRecorder((file) => media.setMediaFile(file));
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

  const handleMediaFile = (file: File) => {
    media.setMediaFile(file);
  };

  const submit = () => {
    if (isSending) return;

    if (voice.isRecording) {
      voice.stop();
      return;
    }

    if (media.attachment) {
      sendMedia.mutate(
        {
          to,
          file: media.attachment.file,
          caption:
            media.attachment.kind === "image"
              ? media.attachment.caption.trim() || undefined
              : undefined,
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
    if (text) {
      send.mutate({ to, text }, { onSuccess: () => setValue("") });
      return;
    }

    if (canRecord) {
      void voice.start();
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (enableTemplates) picker.onValueChange(next);
  };

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-visible border-t border-line bg-card pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
        premium ? "z-20 px-4 py-3" : "px-4 py-3",
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
          disabled={isSending || voice.isRecording}
        />
      ) : null}

      {voice.isRecording ? <VoiceRecordingIndicator seconds={voice.seconds} /> : null}

      {showPinnedReplies && !media.attachment && !voice.isRecording ? (
        <PinnedQuickReplies
          conversationId={conversationId}
          to={to}
          customerName={customerName}
          variant={variant}
          disabled={isSending}
          onInsertText={(text) => setValue(text)}
          onSent={() => setValue("")}
        />
      ) : null}

      <ChatComposerControls
        hasText={hasText}
        hasAttachment={hasAttachment}
        isSending={isSending}
        canRecord={canRecord}
        isRecording={voice.isRecording}
        onAttach={media.openFilePicker}
        onSubmit={submit}
        fileInputRef={media.fileInputRef}
        onFileSelected={handleMediaFile}
        dragActive={dragActive}
        uiTheme={uiTheme}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const item of items) {
            if (item.type.startsWith("image/") || item.type.startsWith("audio/")) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) handleMediaFile(file);
              break;
            }
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleMediaFile(file);
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
              ? "Escribe tu mensaje..."
              : enableTemplates
                ? "Escribe un mensaje o / para plantillas…"
                : "Escribe un mensaje..."
          }
          disabled={isSending || voice.isRecording}
          className={cn(
            "w-full border border-border-strong bg-card text-[14px] text-ink outline-none transition-all duration-150",
            "placeholder:text-placeholder focus:border-brand focus:shadow-[0_0_0_4px_rgba(124,58,237,0.08)] disabled:opacity-60",
            premium
              ? "h-[52px] rounded-[16px] px-4"
              : "h-11 rounded-full border-line bg-canvas px-4 focus-visible:border-brand",
          )}
        />
      </ChatComposerControls>

      {(send.isError || sendMedia.isError || voice.error) && (
        <p className="mt-2 text-[12px] text-danger-ink">
          {voice.error
            ? voice.error
            : send.error instanceof Error
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

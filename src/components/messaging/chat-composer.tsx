"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PendingImageAttachment = {
  file: File;
  previewUrl: string;
  caption: string;
};

export function useMediaAttachment() {
  const [attachment, setAttachment] = useState<PendingImageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAttachment = useCallback(() => {
    setAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const setImageFile = useCallback((file: File) => {
    const type = file.type || "";
    const looksLikeImage =
      type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name || "");
    if (!looksLikeImage) return;
    setAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      };
    });
  }, []);

  const setCaption = useCallback((caption: string) => {
    setAttachment((prev) => (prev ? { ...prev, caption } : prev));
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment?.previewUrl]);

  return {
    attachment,
    fileInputRef,
    setImageFile,
    setCaption,
    clearAttachment,
    openFilePicker,
  };
}

export function MediaAttachmentPreview({
  attachment,
  onCaptionChange,
  onRemove,
  disabled,
}: {
  attachment: PendingImageAttachment;
  onCaptionChange: (caption: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-line bg-canvas p-3">
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.previewUrl}
          alt="Vista previa"
          className="max-h-40 max-w-full rounded-xl object-cover"
        />
        <button
          type="button"
          aria-label="Quitar imagen"
          disabled={disabled}
          onClick={onRemove}
          className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-ink text-white shadow-md disabled:opacity-60"
        >
          <X className="size-4" />
        </button>
      </div>
      <input
        type="text"
        value={attachment.caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        disabled={disabled}
        placeholder="Añade un pie de foto…"
        className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-[14px] outline-none focus-visible:border-brand disabled:opacity-60"
      />
    </div>
  );
}

export function ChatComposerControls({
  hasText,
  hasAttachment,
  isSending,
  onAttach,
  onSubmit,
  fileInputRef,
  onFileSelected,
  onPaste,
  onDrop,
  dragActive,
  uiTheme = "default",
  children,
}: {
  hasText: boolean;
  hasAttachment: boolean;
  isSending: boolean;
  onAttach: () => void;
  onSubmit: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragActive?: boolean;
  uiTheme?: "default" | "premium";
  children: React.ReactNode;
}) {
  const premium = uiTheme === "premium";

  return (
    <div
      className={cn(
        "flex items-center gap-2 transition-colors duration-200",
        premium ? "rounded-[18px]" : "rounded-2xl",
        dragActive && "ring-2 ring-brand ring-offset-2",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        aria-label="Emoji"
        className={cn(
          "grid place-items-center rounded-btn text-muted transition-colors duration-200 hover:bg-hover hover:text-ink",
          premium ? "size-10" : "size-9 hover:bg-brand-soft hover:text-brand",
        )}
      >
        <Smile className={premium ? "size-[18px]" : "size-5"} />
      </button>
      <button
        type="button"
        aria-label="Adjuntar imagen"
        onClick={onAttach}
        disabled={isSending}
        className={cn(
          "grid place-items-center rounded-btn text-muted transition-all duration-200 disabled:opacity-60",
          premium
            ? "size-10 hover:bg-hover hover:text-ink"
            : "size-9 hover:bg-brand-soft hover:text-brand",
        )}
      >
        <Paperclip className={premium ? "size-[18px]" : "size-5"} />
      </button>
      <div className="flex-1" onPaste={onPaste}>
        {children}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSending || (!hasText && !hasAttachment)}
        aria-label={hasText || hasAttachment ? "Enviar" : "Nota de voz"}
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-brand text-white transition-all duration-200",
          "hover:scale-[1.02] hover:bg-brand-hover disabled:opacity-60 disabled:hover:scale-100",
          premium ? "size-11 shadow-send" : "size-11",
        )}
      >
        {isSending ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : hasText || hasAttachment ? (
          <Send className="size-[18px]" />
        ) : (
          <Mic className="size-[18px]" />
        )}
      </button>
    </div>
  );
}

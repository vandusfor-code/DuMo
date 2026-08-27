"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PendingImageAttachment = {
  kind: "image";
  file: File;
  previewUrl: string;
  caption: string;
};

export type PendingAudioAttachment = {
  kind: "audio";
  file: File;
  previewUrl: string;
};

export type PendingMediaAttachment = PendingImageAttachment | PendingAudioAttachment;

function isAudioFile(file: File): boolean {
  const type = file.type || "";
  if (type.startsWith("audio/")) return true;
  return /\.(ogg|opus|mp3|mpeg|webm)$/i.test(file.name || "");
}

function isImageFile(file: File): boolean {
  const type = file.type || "";
  if (type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "");
}

export function useMediaAttachment() {
  const [attachment, setAttachment] = useState<PendingMediaAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAttachment = useCallback(() => {
    setAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const setMediaFile = useCallback((file: File) => {
    if (isAudioFile(file)) {
      setAttachment((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          kind: "audio",
          file,
          previewUrl: URL.createObjectURL(file),
        };
      });
      return;
    }
    if (!isImageFile(file)) return;
    setAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        kind: "image",
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      };
    });
  }, []);

  const setCaption = useCallback((caption: string) => {
    setAttachment((prev) =>
      prev?.kind === "image" ? { ...prev, caption } : prev,
    );
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
    setMediaFile,
    setImageFile: setMediaFile,
    setCaption,
    clearAttachment,
    openFilePicker,
  };
}

function pickVoiceRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }
  return "";
}

function formatRecordingTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Grabación en vivo desde el micrófono del navegador (conversaciones QR). */
export function useVoiceRecorder(onRecorded: (file: File) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      setIsRecording(false);
      cleanupStream();
    }
  }, [cleanupStream]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite grabar audio.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Tu navegador no soporta grabación de voz.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickVoiceRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const resolvedType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: resolvedType });
        const ext = resolvedType.includes("ogg")
          ? "ogg"
          : resolvedType.includes("mp4")
            ? "m4a"
            : "webm";
        const file = new File([blob], `nota-voz-${Date.now()}.${ext}`, { type: resolvedType });
        onRecorded(file);
        cleanupStream();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setSeconds(0);
      };
      recorder.onerror = () => {
        setError("No se pudo grabar el audio.");
        stop();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    } catch {
      cleanupStream();
      setError("Permite el acceso al micrófono para grabar notas de voz.");
    }
  }, [cleanupStream, onRecorded, stop]);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else void start();
  }, [isRecording, start, stop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
      cleanupStream();
    };
  }, [cleanupStream]);

  return { isRecording, seconds, error, start, stop, toggle };
}

export function VoiceRecordingIndicator({ seconds }: { seconds: number }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger-ink">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
      </span>
      Grabando… {formatRecordingTime(seconds)} — pulsa el micrófono para terminar
    </div>
  );
}

export function MediaAttachmentPreview({
  attachment,
  onCaptionChange,
  onRemove,
  disabled,
}: {
  attachment: PendingMediaAttachment;
  onCaptionChange: (caption: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  if (attachment.kind === "audio") {
    return (
      <div className="mb-3 rounded-2xl border border-line bg-canvas p-3">
        <div className="relative">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            controls
            preload="metadata"
            src={attachment.previewUrl}
            className="h-10 w-full max-w-full pr-8"
          />
          <button
            type="button"
            aria-label="Quitar audio"
            disabled={disabled}
            onClick={onRemove}
            className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-ink text-white shadow-md disabled:opacity-60"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 truncate text-[12px] text-muted">{attachment.file.name || "Audio"}</p>
      </div>
    );
  }

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
  canRecord = false,
  isRecording = false,
  onAttach,
  onSubmit,
  onEmojiToggle,
  emojiOpen = false,
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
  canRecord?: boolean;
  isRecording?: boolean;
  onAttach: () => void;
  onSubmit: () => void;
  onEmojiToggle?: () => void;
  emojiOpen?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragActive?: boolean;
  uiTheme?: "default" | "premium";
  children: React.ReactNode;
}) {
  const premium = uiTheme === "premium";
  const showSend = hasText || hasAttachment;
  const primaryEnabled = isSending ? false : isRecording || showSend || canRecord;

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
        accept="image/*,audio/ogg,audio/mpeg,audio/mp3,.ogg,.opus,.mp3"
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
        aria-pressed={emojiOpen}
        onClick={onEmojiToggle}
        disabled={isSending || isRecording || !onEmojiToggle}
        className={cn(
          "grid place-items-center rounded-btn text-muted transition-colors duration-200 hover:bg-hover hover:text-ink disabled:opacity-60",
          premium ? "size-10" : "size-9 hover:bg-brand-soft hover:text-brand",
          emojiOpen && "bg-brand-soft text-brand",
        )}
      >
        <Smile className={premium ? "size-[18px]" : "size-5"} />
      </button>
      <button
        type="button"
        aria-label="Adjuntar imagen o audio"
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
        disabled={!primaryEnabled}
        aria-label={
          isRecording
            ? "Detener grabación"
            : showSend
              ? "Enviar"
              : canRecord
                ? "Grabar nota de voz"
                : "Enviar"
        }
        className={cn(
          "grid shrink-0 place-items-center rounded-full text-white transition-all duration-200",
          "hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100",
          isRecording ? "animate-pulse bg-danger hover:bg-danger" : "bg-brand hover:bg-brand-hover",
          premium ? "size-11 shadow-send" : "size-11",
        )}
      >
        {isSending ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : showSend ? (
          <Send className="size-[18px]" />
        ) : (
          <Mic className="size-[18px]" />
        )}
      </button>
    </div>
  );
}

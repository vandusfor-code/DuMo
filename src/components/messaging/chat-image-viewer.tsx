"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatImageViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => setScale((s) => Math.min(4, s + 0.25))}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Pantalla completa"
            onClick={toggleFullscreen}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
          >
            <Maximize2 className="size-5" />
          </button>
          <a
            href={src}
            download
            onClick={(e) => e.stopPropagation()}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="Descargar"
          >
            <Download className="size-5" />
          </a>
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>
      <div
        className="flex flex-1 cursor-zoom-in items-center justify-center overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? "Imagen"}
          className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}

export function ChatImageBubble({
  src,
  alt,
  caption,
  out,
}: {
  src: string;
  alt?: string;
  caption?: string;
  out?: boolean;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setViewerOpen(true)} className="block max-w-[280px] text-left">
        <div
          className={cn(
            "overflow-hidden rounded-2xl shadow-sm",
            out ? "rounded-br-md" : "rounded-bl-md",
            out && caption ? "bg-brand" : "",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? "Imagen"}
            className="max-w-[280px] object-cover"
          />
          {caption ? (
            <p className={cn("whitespace-pre-line px-2.5 py-2 text-[14px]", out ? "text-white" : "text-ink")}>
              {caption}
            </p>
          ) : null}
        </div>
      </button>
      {viewerOpen ? <ChatImageViewer src={src} alt={alt} onClose={() => setViewerOpen(false)} /> : null}
    </>
  );
}

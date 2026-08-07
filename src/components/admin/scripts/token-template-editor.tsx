"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isKnownTeleprompterToken } from "@/lib/sales-script/cms/token-registry";

type Segment =
  | { type: "text"; value: string }
  | { type: "token"; name: string };

const TOKEN_REGEX = /\{\{([a-z0-9_]+)\}\}/g;

function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of template.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: template.slice(lastIndex, index) });
    }
    const name = match[1] ?? "";
    if (isKnownTeleprompterToken(name)) {
      segments.push({ type: "token", name });
    } else {
      segments.push({ type: "text", value: match[0] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < template.length) {
    segments.push({ type: "text", value: template.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: "text", value: "" }];
}

function serializeSegments(segments: Segment[]): string {
  return segments
    .map((segment) =>
      segment.type === "token" ? `{{${segment.name}}}` : segment.value,
    )
    .join("");
}

type TokenTemplateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function TokenTemplateEditor({ value, onChange, className }: TokenTemplateEditorProps) {
  const [segments, setSegments] = useState<Segment[]>(() => parseTemplate(value));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSegments(parseTemplate(value));
  }, [value]);

  const updateSegments = useCallback(
    (next: Segment[]) => {
      setSegments(next);
      onChange(serializeSegments(next));
    },
    [onChange],
  );

  const updateTextSegment = (index: number, text: string) => {
    const next = segments.map((segment, i) =>
      i === index && segment.type === "text" ? { ...segment, value: text } : segment,
    );
    updateSegments(next);
  };

  const removeToken = (index: number) => {
    updateSegments(segments.filter((_, i) => i !== index));
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pasted = event.clipboardData.getData("text/plain");
    if (!pasted.includes("{{")) return;
    event.preventDefault();
    const parsed = parseTemplate(pasted);
    updateSegments([...segments, ...parsed]);
  };

  const rendered = useMemo(
    () =>
      segments.map((segment, index) => {
        if (segment.type === "token") {
          return (
            <span
              key={`token-${index}-${segment.name}`}
              contentEditable={false}
              draggable
              className="mx-0.5 inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[13px] font-medium text-brand"
              title={`Variable protegida — ${segment.name}`}
            >
              {`{{${segment.name}}}`}
              <button
                type="button"
                className="ml-1 text-[11px] text-muted hover:text-danger"
                onClick={() => removeToken(index)}
                aria-label={`Quitar token ${segment.name}`}
              >
                ×
              </button>
            </span>
          );
        }

        return (
          <span
            key={`text-${index}`}
            contentEditable
            suppressContentEditableWarning
            className="min-w-[1ch] whitespace-pre-wrap outline-none"
            onInput={(event) =>
              updateTextSegment(index, event.currentTarget.textContent ?? "")
            }
            onPaste={handlePaste}
          >
            {segment.value}
          </span>
        );
      }),
    [segments, updateTextSegment, removeToken, handlePaste],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-[320px] w-full rounded-2xl border border-line bg-surface px-4 py-4 text-[15px] leading-relaxed text-ink",
        "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        className,
      )}
      onPaste={handlePaste}
    >
      {rendered}
    </div>
  );
}

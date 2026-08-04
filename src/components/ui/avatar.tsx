"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Initials avatar with a purple-tinted surface. Used for table rows.
 * Deterministic — no image dependency.
 */
export function InitialsAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand",
        "size-10",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Photo avatar with graceful fallback to a neutral ring if the image fails. */
export function PhotoAvatar({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-full bg-brand-soft ring-1 ring-line",
        className,
      )}
    >
      {!failed && (
        // Plain img avoids next/image remote-domain config for a single avatar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";

export type StatusBadgeVariant = "active" | "in_progress" | "pending" | "error";

const STYLES: Record<StatusBadgeVariant, string> = {
  active: "bg-[#ECFDF3] text-[#027A48]",
  in_progress: "bg-[#EEF4FF] text-[#3538CD]",
  pending: "bg-[#FFF7E8] text-[#B54708]",
  error: "bg-[#FEF3F2] text-[#B42318]",
};

export function StatusBadge({
  variant,
  children,
  className,
}: {
  variant: StatusBadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium leading-none",
        STYLES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

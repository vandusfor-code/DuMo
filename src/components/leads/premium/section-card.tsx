"use client";

import { cn } from "@/lib/utils";

/** Tarjeta premium compartida — spec DuMo CRM 2026. */
export function SectionCard({
  children,
  className,
  hoverable,
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-card shadow-card",
        "transition-all duration-200 ease-out",
        hoverable && "hover:-translate-y-0.5 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionCardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 py-4", className)}>
      <div>
        <h3 className="text-[16px] font-semibold leading-[1.45] text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionCardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

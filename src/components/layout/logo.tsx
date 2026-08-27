import { cn } from "@/lib/utils";

/**
 * DuMo brand lockup: a purple mark + the "DuMo" wordmark. Used in the sidebar.
 */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const mark = (
    <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand to-[#8b5cf6] shadow-[0_6px_16px_rgba(109,40,217,0.28)]">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3 15.5V4.5L10 10.5L17 4.5V15.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (compact) {
    return <div className={cn("flex justify-center", className)}>{mark}</div>;
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {mark}
      <span className="text-[22px] font-bold tracking-tight">
        <span className="text-ink">Du</span>
        <span className="text-brand">Mo</span>
      </span>
    </div>
  );
}

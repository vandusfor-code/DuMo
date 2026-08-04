import { cn } from "@/lib/utils";

/** Subtle shimmer placeholder for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-line/70", className)}
      aria-hidden
    />
  );
}

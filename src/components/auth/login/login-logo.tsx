import { cn } from "@/lib/utils";

type LoginLogoProps = {
  variant?: "hero" | "card";
  className?: string;
};

/**
 * Wordmark DuMo para la pantalla de login.
 * hero ≈ 56px · card ≈ 40px (centrado en el panel derecho).
 */
export function LoginLogo({ variant = "hero", className }: LoginLogoProps) {
  const isHero = variant === "hero";

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-[14px] bg-gradient-to-br from-[#6D28FF] to-[#7C3AED] shadow-[0_8px_24px_rgba(109,40,255,0.28)]",
          isHero ? "size-14" : "size-11",
        )}
      >
        <svg
          width={isHero ? 26 : 20}
          height={isHero ? 26 : 20}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="M3 15.5V4.5L10 10.5L17 4.5V15.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-bold tracking-tight text-[#111827]",
          isHero ? "text-[56px] leading-none" : "text-[32px] leading-none",
        )}
      >
        Du
        <span className="text-[#6D28FF]">Mo</span>
      </span>
    </div>
  );
}

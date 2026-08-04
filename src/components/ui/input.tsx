import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text input. Height 52px and 12px radius per the Nueva Venta spec.
 * Supports an optional leading icon slot via the wrapping InputGroup.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-[52px] w-full rounded-input border border-line bg-card px-4 text-[15px] text-ink shadow-sm/0",
        "placeholder:text-muted/70",
        "transition-colors duration-200 outline-none",
        "focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/12",
        "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/12",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/** Wraps an input with a leading icon, keeping padding consistent. */
function InputGroup({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted [&_svg]:size-[18px]">
        {icon}
      </span>
      {children}
    </div>
  );
}

export { Input, InputGroup };

import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-input border border-line bg-card px-4 py-3.5 text-[15px] text-ink",
      "placeholder:text-muted/70 resize-none",
      "transition-colors duration-200 outline-none",
      "focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/12",
      "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/12",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };

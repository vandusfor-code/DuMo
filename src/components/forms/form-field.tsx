import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + inline error, with consistent spacing. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
        {label}
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </Label>
      {children}
      {error && <p className="text-[13px] font-medium text-danger-ink">{error}</p>}
    </div>
  );
}

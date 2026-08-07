import { Card } from "@/components/ui/card";

/** Tarjeta con título, enlace "Ver más" y la gráfica. */
export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink">
          {title}
          {hint && <span className="ml-1.5 text-[11px] font-normal text-muted">{hint}</span>}
        </h3>
        <button
          type="button"
          className="text-[12px] font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          Ver más
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

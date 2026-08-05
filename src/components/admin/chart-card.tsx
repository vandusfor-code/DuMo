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
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">
          {title}
          {hint && <span className="ml-1.5 text-[12px] font-normal text-muted">{hint}</span>}
        </h3>
        <button
          type="button"
          className="text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          Ver más
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

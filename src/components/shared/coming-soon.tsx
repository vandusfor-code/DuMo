import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

/** Temporary placeholder for screens not yet implemented in this milestone. */
export function ComingSoon({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-8 pt-1">
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="grid place-items-center px-6 py-24 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Construction className="size-7" />
        </span>
        <p className="mt-5 text-[17px] font-semibold text-ink">
          Pantalla en construcción
        </p>
        <p className="mt-1 max-w-sm text-[14px] text-muted">
          Esta sección se implementará en una próxima entrega.
        </p>
      </Card>
    </div>
  );
}

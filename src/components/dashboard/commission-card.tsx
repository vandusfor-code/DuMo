import Link from "next/link";
import { ChevronRight, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

/** Estimated-commission card with generated/paid breakdown and a detail link. */
export function CommissionCard({
  estimated,
  generated,
  paid,
}: {
  estimated: number;
  generated: number;
  paid: number;
}) {
  return (
    <Card className="flex flex-col p-7">
      <div className="flex items-start justify-between">
        <h3 className="text-[16px] font-semibold text-ink">Comisión estimada</h3>
        <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
          <DollarSign className="size-5" />
        </span>
      </div>

      <div className="mt-3">
        <p className="text-[38px] font-bold leading-none tracking-tight text-brand">
          {formatCurrency(estimated)}
        </p>
        <p className="mt-2 text-[13px] text-muted">Este mes</p>
      </div>

      <dl className="mt-6 space-y-0">
        <div className="flex items-center justify-between border-t border-line py-4">
          <dt className="text-[14px] text-muted">Comisión generada</dt>
          <dd className="text-[15px] font-semibold text-ink">
            {formatCurrency(generated)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-line py-4">
          <dt className="text-[14px] text-muted">Comisión pagada</dt>
          <dd className="text-[15px] font-semibold text-ink">
            {formatCurrency(paid)}
          </dd>
        </div>
      </dl>

      <Link
        href="/dashboard/comisiones"
        className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        Ver detalle de comisiones
        <ChevronRight className="size-4" />
      </Link>
    </Card>
  );
}

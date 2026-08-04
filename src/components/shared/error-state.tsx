import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Inline error surface with a retry action, used when a query fails. */
export function ErrorState({
  title = "No se pudieron cargar los datos",
  message = "Ocurrió un problema al consultar la información. Intenta nuevamente.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="grid place-items-center px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger-ink">
        <AlertTriangle className="size-7" />
      </span>
      <p className="mt-5 text-[17px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-[14px] text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
      )}
    </Card>
  );
}

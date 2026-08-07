"use client";

import { AlertCircle } from "lucide-react";
import { ClientsPortfolio } from "@/components/clients/clients-portfolio";
import { useCrmClients } from "@/hooks/use-crm-clients";

export default function ClientesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCrmClients();

  return (
    <div className="space-y-4">
      {isError ? (
        <div className="flex items-start gap-2.5 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
          <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
          <div className="space-y-2">
            <p>{error instanceof Error ? error.message : "No se pudo cargar la cartera."}</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="font-semibold underline underline-offset-2 disabled:opacity-60"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : null}
      <ClientsPortfolio clients={data ?? []} isLoading={isLoading} />
    </div>
  );
}

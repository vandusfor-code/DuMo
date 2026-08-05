"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";

/** Muestra error solo si no hay datos en caché — evita que un refetch fallido borre la pantalla. */
export function shouldShowFatalQueryError<T>(
  query: Pick<UseQueryResult<T>, "isError" | "isPending" | "data">,
): boolean {
  return query.isError && !query.data && !query.isPending;
}

export function QueryStaleBanner({
  visible,
  onRetry,
}: {
  visible: boolean;
  onRetry: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-[13px] text-warning-ink">
      <span>No se pudo actualizar. Mostrando los últimos datos guardados.</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold underline underline-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

export function QueryFatalError({
  query,
  title,
  onRetry,
}: {
  query: Pick<UseQueryResult<unknown>, "isError" | "isPending" | "data" | "refetch">;
  title: string;
  onRetry?: () => void;
}) {
  if (!shouldShowFatalQueryError(query)) return null;
  return (
    <ErrorState
      title={title}
      onRetry={onRetry ?? (() => query.refetch())}
    />
  );
}

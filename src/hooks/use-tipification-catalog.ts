"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import {
  buildFallbackTipificationCatalog,
  getTipificationBadgeFromCatalog,
  getTipificationLabelFromCatalog,
  opensCustomFormFromCatalog,
  tipificationSelectOptions,
  triggersSaleFlowFromCatalog,
} from "@/lib/tipification-utils";
import type { Tipification } from "@/types/tipification";

export function useTipificationCatalog(carrier?: string) {
  const fallbackCatalog = useMemo(() => buildFallbackTipificationCatalog(), []);

  const query = useQuery({
    queryKey: ["tipifications", "active", carrier ?? "all"],
    queryFn: () =>
      apiGet<Tipification[]>(
        carrier ? `/api/tipifications?carrier=${encodeURIComponent(carrier)}` : "/api/tipifications",
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: fallbackCatalog,
    retry: 1,
  });

  const catalog = query.data ?? fallbackCatalog;
  const usingFallback = query.isError || (query.isLoading && !query.data);

  return {
    catalog,
    options: tipificationSelectOptions(catalog),
    isLoading: query.isLoading && !query.data,
    isError: query.isError,
    usingFallback,
    triggersSaleFlow: (slug: string) => triggersSaleFlowFromCatalog(slug, catalog),
    opensCustomForm: (slug: string) => opensCustomFormFromCatalog(slug, catalog),
    getLabel: (slug: string) => getTipificationLabelFromCatalog(slug, catalog),
    getBadge: (slug: string) => getTipificationBadgeFromCatalog(slug, catalog),
    refetch: query.refetch,
  };
}

export function useSaleFlowType(slug: string | undefined) {
  const { triggersSaleFlow } = useTipificationCatalog();
  if (!slug) return false;
  return triggersSaleFlow(slug);
}

/** true cuando la tipificación seleccionada abre un formulario propio (Operación Duo). */
export function useOpensCustomFormType(slug: string | undefined) {
  const { opensCustomForm } = useTipificationCatalog();
  if (!slug) return false;
  return opensCustomForm(slug);
}

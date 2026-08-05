"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { AdminCommissionDetailView } from "@/components/admin/commissions/commission-detail";

export default function CommissionDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const search = useSearchParams();
  return (
    <AdminCommissionDetailView
      advisorId={id}
      month={search.get("month") ?? "08"}
      year={search.get("year") ?? "2025"}
    />
  );
}

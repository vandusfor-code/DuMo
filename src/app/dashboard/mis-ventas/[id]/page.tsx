"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SaleDetailView } from "@/components/sales/sale-detail-view";
import { useSale } from "@/hooks/use-sales";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading, isFetching } = useSale(id);

  const showSkeleton = isLoading && isFetching && !data;

  if (showSkeleton) {
    return (
      <div className="space-y-6 pt-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-card" />
          <Skeleton className="h-20 rounded-card" />
          <Skeleton className="h-20 rounded-card" />
        </div>
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 pt-1">
        <Link
          href="/dashboard/mis-ventas"
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-brand hover:text-brand-hover"
        >
          <ArrowLeft className="size-4" />
          Volver a Mis ventas
        </Link>
        <Card className="grid place-items-center px-6 py-20 text-center">
          <p className="text-[17px] font-semibold text-ink">Venta no encontrada</p>
          <p className="mt-1 text-[14px] text-muted">
            La venta que buscas no existe o no está disponible en este momento.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/dashboard/mis-ventas">Ir a Mis ventas</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return <SaleDetailView sale={data} />;
}

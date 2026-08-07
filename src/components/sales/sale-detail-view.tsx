"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Hash,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SaleStatusBadge } from "@/components/shared/sale-status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { useDeleteSale } from "@/hooks/use-sales";
import { SALE_TYPE_LABELS, type SaleDetail } from "@/types/sale";

export function SaleDetailView({
  sale,
  backHref = "/dashboard/mis-ventas",
  backLabel = "Volver a Mis ventas",
}: {
  sale: SaleDetail;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const deleteSale = useDeleteSale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deviceCount = sale.lines.filter((l) => l.deviceName).length;

  const handleDelete = async () => {
    try {
      await deleteSale.mutateAsync(sale.id);
      setConfirmOpen(false);
      router.push(backHref);
    } catch {
      /* mutation error */
    }
  };

  return (
    <div className="space-y-6 pt-1">
      {/* Header */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-brand transition-colors hover:text-brand-hover"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-ink">
              Detalle de Venta
            </h1>
            <SaleStatusBadge status={sale.status} size="md" />
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg">
              <Pencil className="size-[18px]" />
              Editar venta
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Más acciones"
                className="grid size-[54px] place-items-center rounded-[14px] border border-line bg-card text-muted transition-colors hover:bg-brand-soft hover:text-brand data-[state=open]:bg-brand-soft"
              >
                <MoreVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Pencil /> Editar venta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onSelect={() => setConfirmOpen(true)}>
                  <Trash2 /> Eliminar venta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Top meta cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetaCard icon={<Calendar className="size-[18px]" />} label="Fecha de registro" value={formatLongDate(sale.createdAt)} />
        <MetaCard icon={<Hash className="size-[18px]" />} label="ID de venta" value={sale.id} />
        <MetaCard icon={<User className="size-[18px]" />} label="Asesora" value={sale.advisor} />
      </div>

      {/* Customer info */}
      <Card className="p-7">
        <SectionTitle icon={<User className="size-[18px]" />}>
          Información del cliente
        </SectionTitle>
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nombre completo" value={sale.customer.name} />
          <Field label="RUT" value={sale.customer.rut} />
          <Field label="Teléfono de contacto" value={sale.customer.phone} icon={<Phone className="size-4" />} />
          <Field label="Correo electrónico" value={sale.customer.email || "—"} icon={<Mail className="size-4" />} />
        </div>
      </Card>

      {/* Lines */}
      <Card className="p-7">
        <SectionTitle icon={<Smartphone className="size-[18px]" />}>
          Líneas registradas
        </SectionTitle>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-line">
                <TableHead className="w-12 pl-0">#</TableHead>
                <TableHead>Número de línea</TableHead>
                <TableHead>Tipo de venta</TableHead>
                <TableHead>Equipo (si aplica)</TableHead>
                <TableHead className="pr-0">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.lines.map((line, i) => (
                <TableRow key={i} className="min-h-[72px]">
                  <TableCell className="pl-0 text-muted">{i + 1}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <Phone className="size-4 text-brand" />
                      {line.phoneNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted">
                    {SALE_TYPE_LABELS[line.saleType]}
                  </TableCell>
                  <TableCell className="text-muted">
                    {line.deviceName ? (
                      <span className="inline-flex items-center gap-2">
                        <Smartphone className="size-4 text-brand" />
                        {line.deviceName}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="pr-0">
                    <SaleStatusBadge status={line.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Notes + history */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col p-7">
          <SectionTitle icon={<Pencil className="size-[18px]" />}>
            Notas / Observaciones
          </SectionTitle>
          <p className="mt-4 flex-1 whitespace-pre-line text-[14px] leading-relaxed text-muted">
            {sale.notes || "Sin observaciones registradas."}
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-[13px] text-muted">
            <span>Registrado por {sale.advisor}</span>
            <span>{formatLongDate(sale.createdAt)}</span>
          </div>
        </Card>

        <Card className="p-7">
          <SectionTitle icon={<Clock className="size-[18px]" />}>Historial</SectionTitle>
          <ol className="mt-5 space-y-6">
            {sale.history.map((event, i) => (
              <li key={i} className="relative flex gap-4">
                {i < sale.history.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%+8px)] w-px bg-line" />
                )}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-soft text-success-ink">
                  <CheckCircle2 className="size-5" />
                </span>
                <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="leading-tight">
                    <p className="text-[14px] font-semibold text-ink">{event.title}</p>
                    <p className="text-[13px] text-muted">{event.user}</p>
                  </div>
                  <span className="text-[13px] text-muted">
                    {formatDateTime(event.datetime)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Summary */}
      <div className="rounded-card bg-gradient-to-br from-[#f3effe] to-[#ece5fd] p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3.5 lg:w-64">
            <span className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_rgba(109,40,217,0.3)]">
              <DollarSign className="size-6" />
            </span>
            <p className="text-[17px] font-semibold text-brand">
              Resumen de la venta
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4">
            <SummaryStat label="Líneas totales" value={String(sale.lines.length)} />
            <SummaryStat label="Equipos" value={String(deviceCount)} />
            <SummaryStat
              label="Estado"
              value={<SaleStatusBadge status={sale.status} />}
            />
            <SummaryStat label="ID de venta" value={sale.id} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar venta"
        description={`¿Eliminar la venta de ${sale.customer.name}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={deleteSale.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3.5 p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[12px] text-muted">{label}</p>
        <p className="text-[15px] font-semibold text-ink">{value}</p>
      </div>
    </Card>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-[17px] font-semibold text-brand">
      {icon}
      {children}
    </h2>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="inline-flex items-center gap-2 text-[15px] font-medium text-ink">
        {icon && <span className="text-brand">{icon}</span>}
        {value}
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[13px] text-muted">{label}</p>
      <div className="text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}

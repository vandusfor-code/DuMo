"use client";

import { useState } from "react";
import { Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCreateTipification,
  useDeleteTipification,
  useTipificationDeleteCheck,
  useTipificationsAdmin,
  useUpdateTipification,
} from "@/hooks/use-tipifications";
import {
  TIPIFICATION_COLOR_PRESETS,
  findTipificationColorPreset,
} from "@/lib/tipification-colors";
import { cn } from "@/lib/utils";
import { isProtectedTipificationSlug } from "@/lib/tipification-system";
import type { TipificationWithUsage } from "@/types/tipification";

function TipificationBadge({
  name,
  badgeBg,
  badgeText,
}: {
  name: string;
  badgeBg: string;
  badgeText: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium leading-none"
      style={{ backgroundColor: badgeBg, color: badgeText }}
    >
      {name}
    </span>
  );
}

export function TipificationsPanel() {
  const { data = [], isLoading, isError, refetch } = useTipificationsAdmin();
  const create = useCreateTipification();
  const update = useUpdateTipification();
  const remove = useDeleteTipification();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipificationWithUsage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TipificationWithUsage | null>(null);

  if (isLoading) {
    return <Card className="h-64 animate-pulse bg-canvas/60" />;
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[14px] text-muted">No se pudieron cargar las tipificaciones.</p>
        <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Tipificaciones</h3>
          <p className="mt-1 text-[13px] text-muted">
            Clasificación de gestiones en Leads y Clientes — nombre y color visibles en toda la app.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Crear tipificación
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line bg-canvas/40 text-[12px] uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Operador</th>
                <th className="px-5 py-3 font-medium">Color</th>
                <th className="px-5 py-3 font-medium">Flujo venta</th>
                <th className="px-5 py-3 font-medium">En uso</th>
                <th className="w-28 px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const isProtected = isProtectedTipificationSlug(item.slug);
                return (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4 font-medium text-ink">
                    <span className="inline-flex items-center gap-2">
                      {item.name}
                      {isProtected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
                          <Lock className="size-3" />
                          Sistema
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {item.carrier === "claro" ? "Claro" : "WOM"}
                  </td>
                  <td className="px-5 py-4">
                    <TipificationBadge
                      name={item.name}
                      badgeBg={item.badgeBg}
                      badgeText={item.badgeText}
                    />
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {item.triggersSaleFlow ? "Sí" : "No"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {item.usageCount} registro{item.usageCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-5 py-4">
                    {isProtected ? (
                      <span className="text-[12px] text-muted">Protegida</span>
                    ) : (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => {
                          setEditing(item);
                          setDialogOpen(true);
                        }}
                        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar"
                        onClick={() => setDeleteTarget(item)}
                        className="grid size-9 place-items-center rounded-lg text-danger-ink hover:bg-danger-soft"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        {data.length === 0 ? (
          <p className="p-8 text-center text-[14px] text-muted">No hay tipificaciones configuradas.</p>
        ) : null}
      </Card>

      {dialogOpen ? (
        <TipificationFormDialog
          item={editing}
          saving={create.isPending || update.isPending}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={async (values) => {
            if (editing) {
              await update.mutateAsync({ id: editing.id, data: values });
            } else {
              await create.mutateAsync(values);
            }
            setDialogOpen(false);
            setEditing(null);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteTipificationDialog
          item={deleteTarget}
          alternatives={data.filter((t) => t.id !== deleteTarget.id)}
          deleting={remove.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async (reassignToId) => {
            await remove.mutateAsync({
              id: deleteTarget.id,
              reassignToId,
            });
            setDeleteTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}

function TipificationFormDialog({
  item,
  saving,
  onClose,
  onSave,
}: {
  item: TipificationWithUsage | null;
  saving: boolean;
  onClose: () => void;
  onSave: (values: {
    name: string;
    badgeBg: string;
    badgeText: string;
    carrier: string;
    triggersSaleFlow: boolean;
  }) => Promise<void>;
}) {
  const initialPreset =
    findTipificationColorPreset(item?.badgeBg ?? "", item?.badgeText ?? "") ??
    TIPIFICATION_COLOR_PRESETS[1]!;

  const [name, setName] = useState(item?.name ?? "");
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [carrier, setCarrier] = useState(item?.carrier ?? "wom");
  const [triggersSaleFlow, setTriggersSaleFlow] = useState(item?.triggersSaleFlow ?? false);
  const [error, setError] = useState<string | null>(null);

  const preset = TIPIFICATION_COLOR_PRESETS.find((p) => p.id === presetId) ?? initialPreset;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-[17px] font-semibold text-ink">
          {item ? "Editar tipificación" : "Crear tipificación"}
        </h3>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-[13px] text-muted">Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
              placeholder="Ej. Seguimiento"
            />
          </label>

          <label className="block">
            <span className="text-[13px] text-muted">Operador</span>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            >
              <option value="wom">WOM</option>
              <option value="claro">Claro</option>
            </select>
          </label>

          <div>
            <span className="text-[13px] text-muted">Color del badge</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TIPIFICATION_COLOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetId(p.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors",
                    presetId === p.id
                      ? "border-brand bg-brand-soft/30"
                      : "border-line hover:border-brand/30",
                  )}
                >
                  <span
                    className="inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium"
                    style={{ backgroundColor: p.badgeBg, color: p.badgeText }}
                  >
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={triggersSaleFlow}
              onChange={(e) => setTriggersSaleFlow(e.target.checked)}
              className="size-4 accent-brand"
            />
            Activa flujo de venta (SaleDetails, script, registro en Mis Ventas)
          </label>

          {error ? <p className="text-[13px] text-danger-ink">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={saving || !name.trim()}
            onClick={async () => {
              setError(null);
              try {
                await onSave({
                  name: name.trim(),
                  badgeBg: preset.badgeBg,
                  badgeText: preset.badgeText,
                  carrier,
                  triggersSaleFlow,
                });
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo guardar.");
              }
            }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DeleteTipificationDialog({
  item,
  alternatives,
  deleting,
  onClose,
  onConfirm,
}: {
  item: TipificationWithUsage;
  alternatives: TipificationWithUsage[];
  deleting: boolean;
  onClose: () => void;
  onConfirm: (reassignToId?: string) => Promise<void>;
}) {
  const { data: check } = useTipificationDeleteCheck(item.id);
  const usageCount = check?.usageCount ?? item.usageCount;
  const needsReassign = usageCount > 0;
  const [reassignToId, setReassignToId] = useState(alternatives[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-[17px] font-semibold text-ink">Eliminar tipificación</h3>
        <p className="mt-2 text-[14px] text-muted">
          {needsReassign ? (
            <>
              <strong className="text-ink">{item.name}</strong> está siendo usada por{" "}
              <strong className="text-ink">{usageCount}</strong> registro
              {usageCount === 1 ? "" : "s"}. Reasigna esos registros antes de eliminar.
            </>
          ) : (
            <>
              ¿Eliminar <strong className="text-ink">{item.name}</strong>? Esta acción no se puede
              deshacer.
            </>
          )}
        </p>

        {needsReassign ? (
          <label className="mt-4 block">
            <span className="text-[13px] text-muted">Reasignar a</span>
            <select
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            >
              {alternatives.map((alt) => (
                <option key={alt.id} value={alt.id}>
                  {alt.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <p className="mt-3 text-[13px] text-danger-ink">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            className="bg-danger-ink hover:bg-danger-ink/90"
            disabled={deleting || (needsReassign && !reassignToId)}
            onClick={async () => {
              setError(null);
              try {
                await onConfirm(needsReassign ? reassignToId : undefined);
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo eliminar.");
              }
            }}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Eliminar
          </Button>
        </div>
      </Card>
    </div>
  );
}

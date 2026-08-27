"use client";

import { useState } from "react";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCampaignsKillSwitch, useSetCampaignsKillSwitch } from "@/hooks/use-campaigns";
import { cn } from "@/lib/utils";

/** Interruptor de emergencia global (sección 23) — corta TODAS las campañas de inmediato. */
export function CampaignKillSwitch() {
  const { data } = useCampaignsKillSwitch();
  const setKillSwitch = useSetCampaignsKillSwitch();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const active = data?.active ?? false;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => (active ? setKillSwitch.mutate(false) : setConfirmOpen(true))}
        disabled={setKillSwitch.isPending}
        className={cn(active && "border-danger/40 bg-danger-soft text-danger-ink hover:bg-danger-soft")}
      >
        <Power className="size-4" />
        {active ? "Reactivar campañas" : "Detener todo"}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Detener TODAS las campañas"
        description="Ninguna campaña enviará mensajes nuevos hasta que reactives manualmente. Los contactos pendientes quedan intactos, listos para continuar cuando reactives."
        confirmLabel="Detener todo"
        confirmPhrase="DETENER TODO"
        isLoading={setKillSwitch.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await setKillSwitch.mutateAsync(true);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}

"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSetOwnPresence } from "@/hooks/use-advisor-presence";
import {
  ADVISOR_PRESENCE_LABELS,
  ADVISOR_PRESENCE_STATUSES,
  isAdvisorPresenceStatus,
  type AdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import { cn } from "@/lib/utils";

const DOT_CLASS: Record<AdvisorPresenceStatus, string> = {
  disponible: "bg-success",
  bano: "bg-warning",
  almuerzo: "bg-warning",
  desconectado: "bg-muted",
};

/**
 * Selector real del estado operativo de la asesora — arranca "Desconectado"
 * al conectarse (nunca se marca disponible sola); solo en "Disponible"
 * entra en el reparto de leads nuevos. Sincronizado con Live vía el mismo
 * endpoint que ya usa el panel de admin.
 */
export function AdvisorPresenceSelect() {
  const { data: user } = useCurrentUser();
  const setPresence = useSetOwnPresence();

  const current = isAdvisorPresenceStatus(user?.presenceStatus ?? "")
    ? (user!.presenceStatus as AdvisorPresenceStatus)
    : "desconectado";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={setPresence.isPending}
        className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-medium text-ink outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <span className={cn("size-2 rounded-full", DOT_CLASS[current])} />
        {ADVISOR_PRESENCE_LABELS[current]}
        <ChevronDown className="size-3.5 text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {ADVISOR_PRESENCE_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => {
              if (status !== current) setPresence.mutate(status);
            }}
          >
            <span className={cn("size-2 rounded-full", DOT_CLASS[status])} />
            <span className="flex-1">{ADVISOR_PRESENCE_LABELS[status]}</span>
            {status === current ? <Check className="size-4 text-brand" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

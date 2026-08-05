import { ArrowRight, Bell, CalendarClock, Clock, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AdminAlert } from "@/types/admin-dashboard";

const ICONS = {
  goal: Target,
  budget: CalendarClock,
  delivery: Clock,
} as const;

export function AlertsCard({ alerts }: { alerts: AdminAlert[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Bell className="size-[18px] text-danger-ink" />
        <h3 className="text-[15px] font-semibold text-danger-ink">Alertas</h3>
      </div>

      <ul className="mt-4 space-y-4">
        {alerts.map((alert, i) => {
          const Icon = ICONS[alert.kind];
          return (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger-ink">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-ink">{alert.message}</p>
                {alert.progress != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-danger-soft">
                      <div
                        className="h-full rounded-full bg-danger"
                        style={{ width: `${alert.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-danger-ink">
                      {alert.progress}%
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        Ver todas las alertas
        <ArrowRight className="size-4" />
      </button>
    </Card>
  );
}

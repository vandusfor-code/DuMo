import { Activity, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AdminActivity } from "@/types/admin-dashboard";

export function RecentActivityCard({ activity }: { activity: AdminActivity[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Activity className="size-[18px] text-brand" />
        <h3 className="text-[15px] font-semibold text-ink">Actividad reciente</h3>
      </div>

      <ul className="mt-4 space-y-4">
        {activity.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
            <div className="flex flex-1 gap-2">
              <span className="text-[12px] font-medium text-muted">{item.time}</span>
              <p className="text-[13px] leading-snug text-ink">
                <span className="font-semibold">{item.person}</span> {item.action}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        Ver toda la actividad
        <ArrowRight className="size-4" />
      </button>
    </Card>
  );
}

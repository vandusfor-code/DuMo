import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder that mirrors the dashboard's grid so layout is stable. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-7">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-5 h-10 w-24" />
            <Skeleton className="mt-6 h-[180px] w-full rounded-xl" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-7 lg:col-span-2">
          <Skeleton className="h-6 w-56" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </Card>
        <Card className="p-7">
          <Skeleton className="h-6 w-40" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

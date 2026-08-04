import { Bell } from "lucide-react";
import { UserMenu } from "./user-menu";

/**
 * Top utility bar (88px). Holds notifications + the user cluster on the right.
 * Per-page titles/actions are rendered separately by each screen.
 */
export function Header() {
  return (
    <header className="flex h-[88px] items-center justify-end gap-2">
      <button
        type="button"
        aria-label="Notificaciones"
        className="relative grid size-11 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <Bell className="size-[21px]" />
        <span className="absolute right-2 top-2 grid size-[18px] place-items-center rounded-full border-2 border-canvas bg-brand text-[10px] font-semibold text-white">
          3
        </span>
      </button>
      <UserMenu />
    </header>
  );
}

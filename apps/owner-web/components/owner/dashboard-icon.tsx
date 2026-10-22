import type { NavIcon } from "@/domain/workspace/navigation";

export function DashboardIcon({ name, className }: { name: NavIcon | "info" | "calendar" | "moon" | "eye" | "arrow-up" | "bell"; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false"><use href={`/assets/dashboard/icons.svg#${name === "tours" ? "virtual-tours" : name}`} /></svg>;
}

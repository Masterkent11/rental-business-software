import Image from "next/image";
import type { NavIcon } from "@/domain/workspace/navigation";

export function DashboardIcon({
  name,
  className,
  portal = "OWNER",
}: {
  portal?: "OWNER" | "AGENT";
  name: NavIcon | "info" | "calendar" | "moon" | "eye" | "arrow-up" | "bell";
  className?: string;
}) {
  if (portal === "AGENT" && name !== "more") {
    const file =
      (
        {
          inquiries: "leads",
          properties: "represented-properties",
          tours: "virtual-tours",
          profile: "agent-profile",
          marketing: "marketing-hub",
        } as Record<string, string>
      )[name] ?? name;
    return (
      <Image
        src={`/assets/dashboard/agent/navigation/${file}.svg`}
        width={24}
        height={24}
        alt=""
        className={className}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <use
        href={`/assets/dashboard/icons.svg#${name === "tours" ? "virtual-tours" : name}`}
      />
    </svg>
  );
}

"use client";
import Image from "next/image";
import type { ReactNode } from "react";

export function DashboardHeader({
  name,
  caption,
  children,
}: {
  name: string;
  caption: string;
  children?: ReactNode;
}) {
  return (
    <header
      className={`dashboard-header dashboard-header-overview${children ? " has-actions" : ""}`}
    >
      <Image
        className="dashboard-header-art"
        src="/assets/dashboard/owner-header-banner.jpg"
        alt=""
        fill
        sizes="(min-width: 1024px) calc(100vw - 244px), 100vw"
        preload
      />
      <div className="dashboard-greeting">
        <h1>Good day, {name.trim().split(/\s+/)[0] || "there"}</h1>
        <p>{caption}</p>
      </div>
      {children ? (
        <div className="dashboard-header-actions">{children}</div>
      ) : null}
    </header>
  );
}

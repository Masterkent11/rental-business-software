import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "./ui";

export function DashboardMetric({ label, value, hint, illustration, href, loading, error, onRetry }: {
  label: string; value: string | number; hint: string; illustration: string; href: string;
  loading?: boolean; error?: string | null; onRetry?: () => void;
}) {
  return <div className="dashboard-metric">
    <Image src={`/assets/dashboard/illustrations/${illustration}.svg`} width={80} height={80} alt="" className="dashboard-metric-art" />
    <div className="dashboard-metric-copy">
      <span className="dashboard-metric-label">{label}</span>
      {loading ? <Skeleton className="my-2 h-8 w-20" /> : <strong className="dashboard-metric-value">{error ? "—" : value}</strong>}
      <span className="dashboard-metric-hint">{error ? "Unavailable right now" : hint}</span>
    </div>
    <Link href={href} className="dashboard-metric-link focusable" aria-label={`Open ${label.toLowerCase()}`} />
    {error && onRetry ? <button onClick={onRetry} className="dashboard-metric-retry focusable">Retry {label.toLowerCase()}</button> : null}
  </div>;
}

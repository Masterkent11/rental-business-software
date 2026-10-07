import { cn } from "@/lib/utils";

export function BrandMark({ className, title = "Rental Platform" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" role="img" aria-label={title} className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id="brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E293B" />
          <stop offset="0.55" stopColor="#0E1526" />
          <stop offset="1" stopColor="#0A0F1D" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" fill="url(#brand-bg)" />
      <circle cx="512" cy="512" r="330" fill="none" stroke="#FAF7F2" strokeOpacity="0.24" strokeWidth="34" />
      <path d="M 212.9 372.5 A 330 330 0 0 1 782.3 322.7" fill="none" stroke="#FAF7F2" strokeOpacity="0.9" strokeWidth="64" strokeLinecap="round" />
      <circle cx="782.3" cy="322.7" r="62" fill="#FFFFFF" />
      <g fill="none" stroke="#FAF7F2" strokeWidth="76" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 318.8 501.2 L 512 354 L 705.2 501.2" />
        <path d="M 374 473.6 L 374 666.8 L 650 666.8 L 650 473.6" />
      </g>
      <rect x="473.4" y="556.4" width="77.3" height="110.4" rx="12.9" fill="#FAF7F2" />
    </svg>
  );
}

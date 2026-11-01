import { BadgeCheck } from "lucide-react";

export function PartnerVerificationBadge({
  verified,
  portal,
  compact = false,
}: {
  verified: boolean;
  portal: "OWNER" | "AGENT";
  compact?: boolean;
}) {
  if (!verified) return null;
  const label = `Verified ${portal === "OWNER" ? "Owner" : "Agent"} workspace`;
  return (
    <span
      className={`partner-verification-seal${compact ? " partner-verification-compact" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <BadgeCheck
        aria-hidden
        fill="currentColor"
        stroke="white"
        strokeWidth={2.2}
      />
    </span>
  );
}

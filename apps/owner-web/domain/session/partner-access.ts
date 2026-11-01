export type PartnerRole = "OWNER" | "AGENT";
export interface RegistrationInput {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
}
export interface WorkspaceSetup {
  readonly role: PartnerRole;
  readonly workspaceName: string;
  readonly displayName: string;
  readonly headline: string;
  readonly area: string;
}
export function partnerRole(value: unknown): PartnerRole | null {
  return value === "OWNER" || value === "AGENT" ? value : null;
}
export function registrationProblems(
  input: RegistrationInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.fullName.trim().length < 2 || input.fullName.trim().length > 80)
    errors.fullName = "Enter your full name (2 to 80 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = "Enter a valid email address.";
  if (input.password.length < 8) errors.password = "Use at least 8 characters.";
  return errors;
}
export function safePartnerReturn(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\%\u0000-\u0020]/.test(value)
  )
    return fallback;
  const path = value.split(/[?#]/)[0];
  return path === "/" ||
    /^\/(agent|properties|bookings|applications|payments|viewings|messages|inquiries|analytics|tours|account)(\/|$)/.test(
      path,
    )
    ? value
    : fallback;
}

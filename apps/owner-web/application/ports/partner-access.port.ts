import type { RegistrationInput, WorkspaceSetup } from "../../domain/session/partner-access";

export interface PartnerAccessPort {
  register(input: RegistrationInput): Promise<{ confirmationRequired: boolean }>;
  googleAvailable(): Promise<boolean>;
  signInWithGoogle(next: "workspace" | "onboarding"): Promise<void>;
  completeCallback(search: string): Promise<"workspace" | "onboarding" | "recovery">;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  completeSetup(input: WorkspaceSetup): Promise<string>;
}

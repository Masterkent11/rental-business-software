import type { PartnerAccessPort } from "../../ports/partner-access.port";
import {
  registrationProblems,
  type RegistrationInput,
  type WorkspaceSetup,
} from "../../../domain/session/partner-access";

export class RegisterPartnerUseCase {
  constructor(private readonly access: PartnerAccessPort) {}
  async execute(input: RegistrationInput) {
    const errors = registrationProblems(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    return this.access.register({
      ...input,
      fullName: input.fullName.trim(),
      email: input.email.trim(),
    });
  }
}
export class CompletePartnerSetupUseCase {
  constructor(private readonly access: PartnerAccessPort) {}
  async execute(input: WorkspaceSetup) {
    if (
      input.role === "OWNER" &&
      (input.workspaceName.trim().length < 2 ||
        input.workspaceName.trim().length > 80)
    )
      throw new Error("Enter a workspace name (2 to 80 characters).");
    if (
      input.role === "AGENT" &&
      (input.displayName.trim().length < 2 ||
        input.displayName.trim().length > 80)
    )
      throw new Error("Enter your professional name (2 to 80 characters).");
    return this.access.completeSetup(input);
  }
}
export class RequestPartnerPasswordResetUseCase {
  constructor(private readonly access: PartnerAccessPort) {}
  async execute(email: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      throw new Error("Enter a valid email address.");
    return this.access.requestPasswordReset(email.trim());
  }
}
export class UpdatePartnerPasswordUseCase {
  constructor(private readonly access: PartnerAccessPort) {}
  async execute(password: string) {
    if (password.length < 8) throw new Error("Use at least 8 characters.");
    return this.access.updatePassword(password);
  }
}

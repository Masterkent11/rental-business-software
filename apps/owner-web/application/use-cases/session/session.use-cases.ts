import type { SessionPort } from "../../ports/session.port";
import type { ActiveSession } from "../../../domain/session/session";

export class GetCurrentSessionUseCase {
  constructor(private readonly sessionPort: SessionPort) {}

  async execute(): Promise<ActiveSession | null> {
    return this.sessionPort.getCurrentSession();
  }
}

export class SignInUseCase {
  constructor(private readonly sessionPort: SessionPort) {}

  async execute(email: string, password: string): Promise<ActiveSession> {
    if (!email.trim() || !password) {
      throw new Error("Email and password are required");
    }
    return this.sessionPort.signIn(email.trim(), password);
  }
}

export class SignOutUseCase {
  constructor(private readonly sessionPort: SessionPort) {}

  async execute(): Promise<void> {
    return this.sessionPort.signOut();
  }
}

export class SwitchWorkspaceUseCase {
  constructor(private readonly sessionPort: SessionPort) {}

  execute(key: string): void {
    this.sessionPort.rememberWorkspace(key);
  }
}

export class RefreshSessionUseCase {
  constructor(private readonly sessionPort: SessionPort) {}

  async execute(): Promise<ActiveSession> {
    return this.sessionPort.refresh();
  }
}

export class WatchSessionUseCase {
  constructor(private readonly sessionPort: SessionPort) {}
  execute(onChange: (userId: string | null) => void): () => void {
    return this.sessionPort.watchIdentity(onChange);
  }
}

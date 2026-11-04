import type { ActiveSession } from "../../domain/session/session";

export interface SessionPort {
  getCurrentSession(): Promise<ActiveSession | null>;
  signIn(email: string, password: string): Promise<ActiveSession>;
  signOut(): Promise<void>;
  rememberWorkspace(key: string): void;
  refresh(): Promise<ActiveSession>;
  watchIdentity(onChange: (userId: string | null) => void): () => void;
}

/**
 * Application Port: SessionPort
 *
 * Rules:
 * - Depends ONLY on Domain
 * - No Infrastructure / Supabase / Fetch imports
 */

import type { ActiveSession } from "../../domain/session/session";

export interface SessionPort {
  getCurrentSession(): Promise<ActiveSession | null>;
  signIn(email: string, password: string): Promise<ActiveSession>;
  signOut(): Promise<void>;
}

export interface VerificationEvidenceStorage {
  put(input: { userId: string; sessionId: string; captureId: string; evidenceId: string;
    bytes: Uint8Array; expiresAt: string }): Promise<string>;
  remove(userId: string, paths: readonly string[]): Promise<void>;
  reviewUrl(userId: string, path: string, expiresInSeconds: number): Promise<string>;
  cleanupExpired(): Promise<void>;
}

export interface FacebookConnectionSecrets {
  createState(): string;
  digest(state: string): string;
  seal(agentId: string, pageId: string, token: string): string;
}

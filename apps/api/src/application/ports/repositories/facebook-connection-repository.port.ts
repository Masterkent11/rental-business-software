import type { FacebookPage } from "@/application/ports/providers/facebook-pages.port.ts";

export interface FacebookActor {
  readonly userId: string;
  readonly agentId: string;
}

export type PendingFacebookPage = FacebookPage & {
  readonly encryptedToken: string;
};

export interface FacebookChannel {
  readonly connection: (FacebookPage & { readonly connectedAt: string }) | null;
  readonly selection: {
    readonly id: string;
    readonly pages: readonly FacebookPage[];
  } | null;
}

export interface FacebookConnectionRepository {
  read(actor: FacebookActor): Promise<FacebookChannel>;
  start(actor: FacebookActor, digest: string): Promise<void>;
  claim(actor: FacebookActor, digest: string): Promise<boolean>;
  stage(
    actor: FacebookActor,
    digest: string,
    pages: readonly PendingFacebookPage[],
  ): Promise<boolean>;
  select(
    actor: FacebookActor,
    selectionId: string,
    pageId: string,
  ): Promise<boolean>;
  disconnect(actor: FacebookActor): Promise<void>;
}

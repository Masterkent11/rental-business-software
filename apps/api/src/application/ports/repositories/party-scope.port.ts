export type PartyScope =
  | { readonly customerId: string }
  | { readonly organizationId: string }
  | { readonly agentUserId: string };

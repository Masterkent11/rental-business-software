/**
 * The isolation boundary, as a value.
 *
 * Every repository method takes one of these. Making it a required parameter
 * rather than an ambient value is what makes an unscoped query fail to compile
 * instead of failing in production — the first of the two isolation layers in
 * multi-tenancy.md, with RLS underneath it as the second.
 */
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };

export interface OrganizationScope {
  readonly organizationId: OrganizationId;
}

/**
 * The public marketplace reads across organizations by design: a customer
 * searching Cebu should see every verified owner's listings.
 *
 * It is a distinct type rather than "scope is optional", so that a repository
 * method which accepts it says so, and one which does not cannot be called
 * without a real scope by accident.
 */
export interface PublicScope {
  readonly kind: 'public';
}

export const PUBLIC: PublicScope = { kind: 'public' };

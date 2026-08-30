/**
 * Capabilities and roles in the system.
 */
export const CAPABILITIES = [
  'CUSTOMER',
  'TENANT',
  'GUEST',
  'OWNER',
  'STAFF',
  'PLATFORM_ADMIN',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Capabilities that mean nothing outside a specific organization. */
export const ORGANIZATION_SCOPED: ReadonlySet<Capability> = new Set(['OWNER', 'STAFF']);

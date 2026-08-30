import type { Entity } from './entity.ts';

/**
 * Base Aggregate Root representation.
 */
export type AggregateRoot<TId = string> = Entity<TId>;

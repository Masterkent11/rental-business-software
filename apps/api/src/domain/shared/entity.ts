/**
 * Base Entity representation.
 */
export interface Entity<TId = string> {
  readonly id: TId;
}

/**
 * Application domain errors.
 */

export class InvalidTransitionError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

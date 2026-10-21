export interface VerificationImageValidator {
  validate(image: Uint8Array): Promise<Uint8Array>;
}

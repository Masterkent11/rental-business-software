import type { ApplicationRepository } from '@/application/ports/repositories/application-repository.port.ts';

export interface SubmitApplicationInput {
  readonly resourceId: string;
  readonly applicantId: string;
  readonly desiredMoveIn: string;
  readonly desiredTermMonths: number;
  readonly message: string;
}

export const submitApplication =
  (applications: ApplicationRepository) =>
  (input: SubmitApplicationInput) =>
    applications.submit(input);

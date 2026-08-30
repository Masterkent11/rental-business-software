import type { ApplicationRepository, ApplicationDetail } from '@/application/ports/repositories/application-repository.port.ts';

export const getMyApplications =
  (applications: ApplicationRepository) =>
  (applicantId: string): Promise<readonly ApplicationDetail[]> =>
    applications.forApplicant(applicantId);

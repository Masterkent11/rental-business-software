import type { ApplicationRepository, Application } from '@/application/ports/repositories/application-repository.port.ts';

export const withdrawApplication =
  (applications: ApplicationRepository) =>
  (applicantId: string, applicationId: string): Promise<Application> =>
    applications.withdraw(applicantId, applicationId);

import { assertApplicationDocumentPath } from '@/domain/applications/application-rules.ts';
import type { ApplicationRepository, ApplicationDetail } from '@/application/ports/repositories/application-repository.port.ts';
import type { DocumentStorage } from '@/application/ports/storage/document-storage.port.ts';

export interface ApplicationDocumentWithUrl {
  readonly id: string;
  readonly kind: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly url: string | null;
}

export interface ApplicationDetailWithUrls {
  readonly application: ApplicationDetail;
  readonly documents: readonly ApplicationDocumentWithUrl[];
}

export const getMyApplication =
  (applications: ApplicationRepository, storage: DocumentStorage) =>
  async (
    applicantId: string,
    applicationId: string,
  ): Promise<ApplicationDetailWithUrls | null> => {
    const application = await applications.forApplicantById(applicantId, applicationId);
    if (!application) return null;

    const documents = await Promise.all(
      application.documents.map(async (doc) => {
        let url: string | null = null;
        try {
          assertApplicationDocumentPath(doc.storagePath, application.organizationId, application.id);
          url = await storage.createReadUrl(doc.storagePath);
        } catch {
          url = null;
        }
        return {
          id: doc.id,
          kind: doc.kind,
          fileName: doc.fileName,
          sizeBytes: doc.sizeBytes,
          url,
        };
      }),
    );

    return {
      application,
      documents,
    };
  };

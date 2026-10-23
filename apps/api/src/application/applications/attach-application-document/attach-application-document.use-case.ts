import { assertApplicationDocumentPath } from '@/domain/applications/application-rules.ts';
import type { ApplicationRepository } from '@/application/ports/repositories/application-repository.port.ts';
import { ApplicationNotFoundError } from '@/application/ports/repositories/application-repository.port.ts';
import type {
  DocumentStorage,
  UploadTicket,
} from '@/application/ports/storage/document-storage.port.ts';
import type { DocumentKind } from '@/domain/applications/application.ts';

export interface CreateDocumentTicketInput {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly fileName: string;
}

export interface AttachApplicationDocumentInput {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly kind: DocumentKind;
  readonly storagePath: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface AttachedDocumentResult {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly fileName: string;
}

export const createDocumentUploadTicket =
  (applications: ApplicationRepository, storage: DocumentStorage) =>
  async (input: CreateDocumentTicketInput): Promise<{ upload: UploadTicket }> => {
    const application = await applications.forApplicantById(
      input.applicantId,
      input.applicationId,
    );
    if (!application) {
      throw new ApplicationNotFoundError('No such application');
    }

    const ticket = await storage.createUploadTicket({
      organizationId: application.organizationId,
      applicationId: input.applicationId,
      fileName: input.fileName,
    });

    return { upload: ticket };
  };

export const attachApplicationDocument =
  (applications: ApplicationRepository) =>
  async (
    input: AttachApplicationDocumentInput,
  ): Promise<AttachedDocumentResult> => {
    const application = await applications.forApplicantById(
      input.applicantId,
      input.applicationId,
    );
    if (!application) {
      throw new ApplicationNotFoundError('No such application');
    }

    assertApplicationDocumentPath(input.storagePath, application.organizationId, input.applicationId);
    const document = await applications.attachDocument({
      applicantId: input.applicantId,
      applicationId: input.applicationId,
      kind: input.kind,
      storagePath: input.storagePath,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });

    return {
      id: document.id,
      kind: document.kind,
      fileName: document.fileName,
    };
  };

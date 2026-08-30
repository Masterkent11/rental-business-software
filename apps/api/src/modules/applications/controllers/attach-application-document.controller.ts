import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ATTACH_APPLICATION_DOCUMENT,
  CREATE_DOCUMENT_UPLOAD_TICKET,
} from '@/modules/applications/application.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type {
  createDocumentUploadTicket,
  attachApplicationDocument,
} from '@/application/applications/attach-application-document/attach-application-document.use-case.ts';
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  attachDocumentSchema,
} from '@/modules/applications/dto/attach-document.dto.ts';

@Controller('applications')
export class AttachApplicationDocumentController {
  constructor(
    @Inject(CREATE_DOCUMENT_UPLOAD_TICKET)
    private readonly createTicketUseCase: ReturnType<typeof createDocumentUploadTicket>,
    @Inject(ATTACH_APPLICATION_DOCUMENT)
    private readonly attachDocumentUseCase: ReturnType<typeof attachApplicationDocument>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post(':id/documents')
  async attach(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    if (!z.guid().safeParse(id).success) {
      throw new NotFoundException('No such application');
    }

    const parsed = attachDocumentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Bad request');
    }
    if (!ALLOWED_DOCUMENT_TYPES.has(parsed.data.contentType)) {
      throw new BadRequestException('Send a photo or a PDF');
    }
    if (parsed.data.sizeBytes > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('That file is larger than 10 MB');
    }

    const principal = await this.resolve({ authorization: auth, organizationId: null });

    if (!parsed.data.storagePath) {
      return this.createTicketUseCase({
        applicantId: principal.userId,
        applicationId: id,
        fileName: parsed.data.fileName,
      });
    }

    return this.attachDocumentUseCase({
      applicantId: principal.userId,
      applicationId: id,
      kind: parsed.data.kind,
      storagePath: parsed.data.storagePath,
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
    });
  }
}

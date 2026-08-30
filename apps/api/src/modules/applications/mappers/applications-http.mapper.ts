import type { ApplicationDetail } from '@/application/ports/repositories/application-repository.port.ts';

export const toApplicationHttpResponse = (application: ApplicationDetail) => ({
  id: application.id,
  reference: application.reference,
  state: application.state,
  listingTitle: application.listingTitle,
  photo: application.photo,
  moveInCostCentavos: application.moveInCostCentavos,
  propertyName: application.propertyName,
  areaLabel: application.areaLabel,
  cityLabel: application.cityLabel,
  monthlyRentCentavos: application.monthlyRentCentavos,
  desiredMoveIn: application.desiredMoveIn,
  desiredTermMonths: application.desiredTermMonths,
  message: application.message,
  decisionReason: application.decisionReason,
  decidedAt: application.decidedAt?.toISOString() ?? null,
  createdAt: application.createdAt.toISOString(),
  holdExpiresAt: application.holdExpiresAt?.toISOString() ?? null,
  documentCount: application.documents.length,
  documentNames: application.documents.map((doc) => doc.fileName),
  reservation: application.reservation
    ? {
        state: application.reservation.state,
        feeCentavos: application.reservation.feeCentavos,
        expiresAt: application.reservation.expiresAt?.toISOString() ?? null,
      }
    : null,
});

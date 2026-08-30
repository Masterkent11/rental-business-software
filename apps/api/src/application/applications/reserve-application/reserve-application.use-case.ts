import type { ApplicationRepository } from '@/application/ports/repositories/application-repository.port.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { ReservationState } from '@/domain/reservations/reservation-state.ts';

export interface ReserveApplicationInput {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly holdMinutes?: number;
}

export interface ReserveApplicationResult {
  readonly reservationId: string;
  readonly occupancyId: string | null;
  readonly feeCentavos: Centavos;
  readonly state: ReservationState;
}

export const reserveApplication =
  (applications: ApplicationRepository) =>
  async (input: ReserveApplicationInput): Promise<ReserveApplicationResult> => {
    const reservation = await applications.reserve({
      applicantId: input.applicantId,
      applicationId: input.applicationId,
      holdMinutes: input.holdMinutes ?? 60,
    });

    return {
      reservationId: reservation.id,
      occupancyId: reservation.occupancyId,
      feeCentavos: reservation.feeCentavos,
      state: reservation.state,
    };
  };

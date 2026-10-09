import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  OrganizationForbiddenError,
  UnauthenticatedError,
} from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import {
  AlreadyReservedError,
  ApplicationNotFoundError,
  ApprovalConflictError,
  DuplicateApplicationError,
  NotApplicableError,
  ReservationNotOfferedError,
} from '@/application/ports/repositories/application-repository.port.ts';
import {
  NotBookableError,
  OccupancyConflictError,
  SerializationError,
} from '@/application/ports/repositories/occupancy-repository.port.ts';
import {
  AmountMismatchError,
  BookingNotHeldError,
} from '@/application/ports/repositories/payment-repository.port.ts';
import { BlockConflictError } from '@/application/ports/repositories/booking-repository.port.ts';
import {
  PaymentProviderUnavailableError,
  WebhookVerificationError,
} from '@/application/ports/providers/payment-gateway.port.ts';
import {
  SceneNotFoundError,
  TourNotFoundError,
} from '@/application/ports/repositories/tour-repository.port.ts';
import {
  EmptyInvoiceError,
  InvalidPeriodError,
} from '@/application/collection/issue-invoice/issue-invoice.use-case.ts';
import { InvoiceMissingError } from '@/application/collection/apply-payment-to-invoice/apply-payment-to-invoice.use-case.ts';
import {
  PaymentNotOwnedError,
  SimulationUnavailableError,
} from '@/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';
import { PaymentNotYoursError } from '@/application/payments/start-booking-payment/start-booking-payment.use-case.ts';
import { StayTooLongError } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { InvalidTransitionError } from '@/domain/applications/application.ts';
import { InvalidDateRangeError } from '@/domain/occupancy/occupancy.ts';
import {
  InvoiceNotSettleableError,
  InvoiceOverpaidError,
} from '@/domain/collection/collection.ts';
import { TourNotPublishableError } from '@/domain/tours/tour.ts';
import {
  InvalidListingDetailsError,
  InvalidListingTransitionError,
  ListingNotFoundError,
  ListingNotPublishableError,
  ListingPhotoRejectedError,
} from '@/domain/listings/listing.ts';
import {
  BookingNotHeldError as DomainBookingNotHeldError,
  GuestLimitExceededError,
  InvalidStayTransitionError,
  StayTooLongError as DomainStayTooLongError,
  StayTooShortError,
} from '@/domain/bookings/booking.ts';
import {
  ConversationNotAllowedError,
  ConversationNotFoundError,
  InvalidMessageError,
} from '@/domain/messaging/conversation.ts';
import { InvalidProfileError } from '@/domain/identity/identity.ts';
import {
  AgentNotAssignableError,
  AgentProfileExistsError,
  AgentProfileNotFoundError,
  InvalidAgentProfileError,
  InvalidRepresentationTransitionError,
  InvalidVerificationRequestError,
  ListingAlreadyRepresentedError,
  RepresentationForbiddenError,
  RepresentationNotFoundError,
} from '@/domain/agents/agent.ts';
import {
  InquiryNotAllowedError,
  InquiryNotFoundError,
  InvalidInquiryError,
  InvalidInquiryTransitionError,
} from '@/domain/inquiries/inquiry.ts';
import {
  InvalidViewingSlotError,
  InvalidViewingTransitionError,
  ViewingAlreadyRequestedError,
  ViewingNotFoundError,
  ViewingSlotTakenError,
} from '@/domain/viewings/viewing.ts';
import {
  InvalidSceneViewError,
  InvalidTourProviderError,
  SceneRemovalBlockedError,
  TourNotFoundError as DomainTourNotFoundError,
} from '@/domain/tours/tour.ts';
import { InvalidLocationError } from '@/domain/shared/geo.ts';
import {
  ContentNotFoundError,
  InvalidSupportRequestError,
  OutdatedPolicyVersionError,
} from '@/domain/content/content.ts';

type Rule = readonly [
  readonly (abstract new (...args: never[]) => Error)[],
  number,
  string,
  string | null,
];

const RULES: readonly Rule[] = [
  [[UnauthenticatedError], HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Please sign in again.'],
  [[OrganizationForbiddenError], HttpStatus.FORBIDDEN, 'FORBIDDEN', null],
  [[WebhookVerificationError], HttpStatus.UNAUTHORIZED, 'WEBHOOK_REJECTED', 'Signature check failed'],
  [
    [
      ApplicationNotFoundError,
      TourNotFoundError,
      InvoiceMissingError,
      BookingNotHeldError,
      DomainBookingNotHeldError,
      PaymentNotOwnedError,
      PaymentNotYoursError,
      NotBookableError,
      ListingNotFoundError,
      ConversationNotFoundError,
      AgentProfileNotFoundError,
      RepresentationNotFoundError,
      InquiryNotFoundError,
      ViewingNotFoundError,
      DomainTourNotFoundError,
      ContentNotFoundError,
    ],
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    null,
  ],
  [[OccupancyConflictError, BlockConflictError], HttpStatus.CONFLICT, 'DATES_UNAVAILABLE', null],
  [[ViewingSlotTakenError], HttpStatus.CONFLICT, 'SLOT_TAKEN', null],
  [[OutdatedPolicyVersionError], HttpStatus.CONFLICT, 'POLICY_OUTDATED', null],
  [[ViewingAlreadyRequestedError], HttpStatus.CONFLICT, 'ALREADY_REQUESTED', null],
  [[ListingAlreadyRepresentedError], HttpStatus.CONFLICT, 'ALREADY_REPRESENTED', null],
  [[RepresentationForbiddenError], HttpStatus.FORBIDDEN, 'FORBIDDEN', null],
  [
    [
      ApprovalConflictError,
      TourNotPublishableError,
      InvoiceOverpaidError,
      InvoiceNotSettleableError,
      InvalidListingTransitionError,
      InvalidStayTransitionError,
      AgentProfileExistsError,
      InvalidRepresentationTransitionError,
      InvalidInquiryTransitionError,
      InvalidViewingTransitionError,
      SceneRemovalBlockedError,
    ],
    HttpStatus.CONFLICT,
    'CONFLICT',
    null,
  ],
  [[ListingNotPublishableError], HttpStatus.UNPROCESSABLE_ENTITY, 'NOT_PUBLISHABLE', null],
  [[SerializationError], HttpStatus.SERVICE_UNAVAILABLE, 'BUSY', 'Busy right now — try again'],
  [[SimulationUnavailableError], HttpStatus.NOT_IMPLEMENTED, 'NOT_AVAILABLE', null],
  [[PaymentProviderUnavailableError], HttpStatus.SERVICE_UNAVAILABLE, 'PAYMENT_UNAVAILABLE', null],
  [[ConversationNotAllowedError], HttpStatus.FORBIDDEN, 'FORBIDDEN', null],
  [
    [
      DuplicateApplicationError,
      AlreadyReservedError,
      ReservationNotOfferedError,
      NotApplicableError,
      InvalidTransitionError,
      StayTooLongError,
      DomainStayTooLongError,
      StayTooShortError,
      GuestLimitExceededError,
      InvalidDateRangeError,
      EmptyInvoiceError,
      InvalidPeriodError,
      AmountMismatchError,
      SceneNotFoundError,
      InvalidListingDetailsError,
      ListingPhotoRejectedError,
      InvalidMessageError,
      InvalidProfileError,
      InvalidAgentProfileError,
      AgentNotAssignableError,
      InvalidVerificationRequestError,
      InvalidInquiryError,
      InquiryNotAllowedError,
      InvalidViewingSlotError,
      InvalidTourProviderError,
      InvalidSceneViewError,
      InvalidLocationError,
      InvalidSupportRequestError,
    ],
    HttpStatus.BAD_REQUEST,
    'INVALID_REQUEST',
    null,
  ],
];

const CODE_BY_STATUS: Record<number, string> = {
  400: 'INVALID_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'INVALID_REQUEST',
  429: 'RATE_LIMITED',
};

@Catch()
export class PresentationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : typeof (res as { message?: unknown }).message === 'string'
            ? (res as { message: string }).message
            : Array.isArray((res as { message?: unknown }).message)
              ? String((res as { message: unknown[] }).message[0])
              : exception.message;
      return response.status(status).send({
        statusCode: status,
        code: CODE_BY_STATUS[status] ?? 'ERROR',
        title: message,
        message,
      });
    }

    for (const [types, status, code, override] of RULES) {
      if (types.some((type) => exception instanceof type)) {
        const message = override ?? (exception as Error).message;
        const extra =
          exception instanceof ListingNotPublishableError ? { problems: exception.problems } : {};
        return response.status(status).send({ statusCode: status, code, title: message, message, ...extra });
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'Something went wrong on our side. Please try again.';
    return response.status(status).send({ statusCode: status, code: 'INTERNAL', title: message, message });
  }
}

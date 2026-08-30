import {
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

// Application & Domain Errors
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
import { WebhookVerificationError } from '@/application/ports/providers/payment-gateway.port.ts';
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
import { StayTooLongError } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { InvalidTransitionError } from '@/domain/applications/application.ts';
import { InvalidDateRangeError } from '@/domain/occupancy/occupancy.ts';
import {
  InvoiceNotSettleableError,
  InvoiceOverpaidError,
} from '@/domain/collection/collection.ts';
import { TourNotPublishableError } from '@/domain/tours/tour.ts';

@Catch()
export class PresentationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    // 1. If already a NestJS HttpException, pass through
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response.status(status).send(typeof res === 'string' ? { message: res, statusCode: status } : res);
    }

    // 2. Map domain/application errors
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = (exception as Error)?.message || 'Internal server error';

    if (
      exception instanceof UnauthenticatedError
    ) {
      status = HttpStatus.UNAUTHORIZED;
    } else if (
      exception instanceof OrganizationForbiddenError
    ) {
      status = HttpStatus.FORBIDDEN;
    } else if (
      exception instanceof ApplicationNotFoundError ||
      exception instanceof TourNotFoundError ||
      exception instanceof InvoiceMissingError ||
      exception instanceof BookingNotHeldError ||
      exception instanceof PaymentNotOwnedError ||
      exception instanceof NotBookableError
    ) {
      status = HttpStatus.NOT_FOUND;
    } else if (
      exception instanceof ApprovalConflictError ||
      exception instanceof OccupancyConflictError ||
      exception instanceof TourNotPublishableError ||
      exception instanceof InvoiceOverpaidError ||
      exception instanceof InvoiceNotSettleableError
    ) {
      status = HttpStatus.CONFLICT;
    } else if (exception instanceof SerializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Busy right now — try again';
    } else if (exception instanceof SimulationUnavailableError) {
      status = HttpStatus.NOT_IMPLEMENTED;
    } else if (
      exception instanceof DuplicateApplicationError ||
      exception instanceof AlreadyReservedError ||
      exception instanceof ReservationNotOfferedError ||
      exception instanceof NotApplicableError ||
      exception instanceof InvalidTransitionError ||
      exception instanceof StayTooLongError ||
      exception instanceof InvalidDateRangeError ||
      exception instanceof EmptyInvoiceError ||
      exception instanceof InvalidPeriodError ||
      exception instanceof AmountMismatchError ||
      exception instanceof SceneNotFoundError
    ) {
      status = HttpStatus.BAD_REQUEST;
    } else if (exception instanceof WebhookVerificationError) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Signature check failed';
    }

    return response.status(status).send({
      statusCode: status,
      message,
    });
  }
}

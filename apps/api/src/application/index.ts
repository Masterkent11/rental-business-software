/**
 * Application Layer
 *
 * Hexagonal architecture boundary defining:
 * 1. Outbound ports (contracts implemented by infrastructure adapters)
 * 2. Inbound use cases (orchestration of domain rules and port capabilities)
 */

// Outbound Ports
export * from './ports/repositories/application-repository.port.ts';
export * from './ports/storage/document-storage.port.ts';
export * from './ports/providers/identity-provider.port.ts';
export * from './ports/repositories/invoice-repository.port.ts';
export * from './ports/repositories/listing-repository.port.ts';
export * from './ports/storage/media-storage.port.ts';
export * from './ports/repositories/occupancy-repository.port.ts';
export * from './ports/providers/panorama-processor.port.ts';
export * from './ports/providers/payment-gateway.port.ts';
export * from './ports/repositories/payment-repository.port.ts';
export * from './ports/repositories/tour-repository.port.ts';
export * from './ports/repositories/user-repository.port.ts';

// Inbound Use Cases & Authorization Rules
export * from './applications/submit-application/submit-application.use-case.ts';
export * from './applications/decide-application/decide-application.use-case.ts';
export * from './applications/withdraw-application/withdraw-application.use-case.ts';
export * from './applications/attach-application-document/attach-application-document.use-case.ts';
export * from './applications/reserve-application/reserve-application.use-case.ts';
export * from './applications/get-my-applications/get-my-applications.use-case.ts';
export * from './applications/get-my-application/get-my-application.use-case.ts';
export * from './applications/list-organization-applications/list-organization-applications.use-case.ts';

export * from './collection/get-owner-collection/get-owner-collection.use-case.ts';
export * from './collection/issue-invoice/issue-invoice.use-case.ts';
export * from './collection/apply-payment-to-invoice/apply-payment-to-invoice.use-case.ts';

export * from './bookings/view-availability/view-availability.use-case.ts';
export * from './bookings/place-hold/place-hold.use-case.ts';

export * from './payments/start-booking-payment/start-booking-payment.use-case.ts';
export * from './payments/confirm-booking-payment/confirm-booking-payment.use-case.ts';
export * from './payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';

export * from './listings/search-listings/search-listings.use-case.ts';
export * from './listings/view-listing/view-listing.use-case.ts';
export * from './listings/list-owner-listings/list-owner-listings.use-case.ts';
export * from './listings/list-owner-resources/list-owner-resources.use-case.ts';
export * from './listings/create-listing/create-listing.use-case.ts';
export * from './listings/register-listing-photo/register-listing-photo.use-case.ts';
export * from './listings/remove-listing-photo/remove-listing-photo.use-case.ts';
export * from './listings/reorder-listing-photos/reorder-listing-photos.use-case.ts';
export * from './listings/create-property-listing/create-property-listing.use-case.ts';
export * from './listings/update-listing/update-listing.use-case.ts';
export * from './listings/get-owner-listing/get-owner-listing.use-case.ts';
export * from './listings/list-owner-properties/list-owner-properties.use-case.ts';
export * from './listings/quote-stay/quote-stay.use-case.ts';
export * from './listings/set-listing-state/set-listing-state.use-case.ts';

export * from './tours/view-tour/view-tour.use-case.ts';
export * from './tours/create-owner-tour/create-owner-tour.use-case.ts';
export * from './tours/get-owner-tour/get-owner-tour.use-case.ts';
export * from './tours/add-scene/add-scene.use-case.ts';
export * from './tours/reorder-scenes/reorder-scenes.use-case.ts';
export * from './tours/rename-scene/rename-scene.use-case.ts';
export * from './tours/set-entry-scene/set-entry-scene.use-case.ts';
export * from './tours/add-hotspot/add-hotspot.use-case.ts';
export * from './tours/remove-hotspot/remove-hotspot.use-case.ts';
export * from './tours/publish-tour/publish-tour.use-case.ts';
export * from './tours/unpublish-tour/unpublish-tour.use-case.ts';

export * from './me/get-me/get-me.use-case.ts';
export * from './me/get-my-stays/get-my-stays.use-case.ts';
export * from './me/get-saved-listings/get-saved-listings.use-case.ts';
export * from './me/save-listing/save-listing.use-case.ts';
export * from './me/unsave-listing/unsave-listing.use-case.ts';

export * from './identity/resolve-principal/resolve-principal.use-case.ts';
export * from './identity/application-authorization.rules.ts';

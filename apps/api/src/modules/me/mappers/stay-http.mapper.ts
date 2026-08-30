import type { StayReceipt } from '@/application/ports/repositories/user-repository.port.ts';

export function toStayHttpResponse(stay: StayReceipt) {
  return {
    stayId: stay.stayId,
    reference: stay.reference,
    listingTitle: stay.listingTitle,
    propertyName: stay.propertyName,
    areaLabel: stay.areaLabel,
    cityLabel: stay.cityLabel,
    startsOn: stay.startsOn,
    endsOn: stay.endsOn,
    nights: stay.nights,
    paidCentavos: stay.paidCentavos,
    paidAt: stay.paidAt?.toISOString() ?? null,
    state: stay.state,
    photo: stay.photo,
    stateLabel: stay.stateLabel,
    bucket: stay.bucket,
  };
}

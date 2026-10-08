import type { PartnerRepositoryPort } from "../../ports/partner-repository.port";
import type { PartnerScope } from "../../../domain/workspace/workspace";
import { nextStatuses, type Inquiry, type InquiryStatus } from "../../../domain/inquiries/inquiry";
import type { PartnerViewingAction, Viewing } from "../../../domain/viewings/viewing";

export class LoadInquiriesUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, filters: { status?: InquiryStatus; listingId?: string } = {}): Promise<readonly Inquiry[]> {
    return this.repository.getInquiries(scope, filters);
  }
}

export class MoveInquiryUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, inquiry: Inquiry, status: InquiryStatus, lostReason: string | null): Promise<Inquiry> {
    if (!nextStatuses(inquiry.status).includes(status)) throw new Error("That stage is not available for this lead");
    return this.repository.updateInquiryStatus(scope, inquiry.id, status, status === "LOST" ? lostReason : null);
  }
}

export class LoadViewingsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, range: { from?: string; to?: string } = {}): Promise<readonly Viewing[]> {
    return this.repository.getViewings(scope, range);
  }
}

export class ViewingActionUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, viewingId: string, action: PartnerViewingAction, note: string | null): Promise<Viewing> {
    if (note && note.length > 1000) throw new Error("Keep the note under 1,000 characters");
    return this.repository.viewingAction(scope, viewingId, action, note?.trim() || null);
  }
}

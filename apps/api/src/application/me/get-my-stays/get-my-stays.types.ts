import type { StayReceipt } from '@/application/ports/repositories/user-repository.port.ts';

export interface GetMyStaysInput {
  readonly userId: string;
}

export type GetMyStaysResult = readonly StayReceipt[];

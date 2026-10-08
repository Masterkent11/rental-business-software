import type { Scene, TourProvider, TourState } from './tour-state.ts';

export * from './tour-state.ts';
export * from './tour-rules.ts';
export * from './tour-errors.ts';

export interface Tour {
  readonly id: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly state: TourState;
  readonly entrySceneId: string | null;
  readonly scenes: readonly Scene[];
  readonly provider?: TourProvider;
  readonly externalModelId?: string | null;
}

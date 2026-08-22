import { describe, expect, it, vi } from 'vitest';
import { StayTooLongError, placeHold } from '../place-hold.ts';
import {
  OccupancyConflictError,
  SerializationError,
  type OccupancyRepository,
} from '../../../application/ports/occupancy-repository.ts';
import type { Occupancy } from '../../../domain/occupancy/occupancy.ts';

const GUEST = '99999999-9999-4999-8999-999999999999';

const held: Occupancy = {
  id: 'o-1',
  organizationId: 'org-1',
  resourceId: 'r-1',
  kind: 'BOOKING',
  state: 'HELD',
  during: { startsOn: '2026-12-01', endsOn: '2026-12-04' },
  expiresAt: new Date('2026-12-01T10:00:00Z'),
};

const repoThatThrows = (
  errors: unknown[],
): { repo: OccupancyRepository; calls: () => number } => {
  let calls = 0;
  return {
    calls: () => calls,
    repo: {
      nightsFor: async () => [],
      placeHold: async () => {
        const error = errors[calls];
        calls += 1;
        if (error) throw error;
        return held;
      },
    },
  };
};

describe('placeHold', () => {
  it('holds the nights when they are free', async () => {
    const { repo } = repoThatThrows([]);
    const result = await placeHold(repo)({
      resourceId: 'r-1',
      startsOn: '2026-12-01',
      endsOn: '2026-12-04',
      heldBy: GUEST,
    });

    expect(result.state).toBe('HELD');
  });

  it('retries a serialization failure, which is an accident of timing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { repo, calls } = repoThatThrows([new SerializationError('busy')]);

    const result = await placeHold(repo)({
      resourceId: 'r-1',
      startsOn: '2026-12-01',
      endsOn: '2026-12-04',
      heldBy: GUEST,
    });

    expect(calls()).toBe(2);
    expect(result.state).toBe('HELD');
    vi.useRealTimers();
  });

  it('never retries a real conflict', async () => {
    // Those nights are gone. Retrying would make the customer wait to be told
    // something that was already true.
    const { repo, calls } = repoThatThrows([
      new OccupancyConflictError('taken'),
    ]);

    await expect(
      placeHold(repo)({
        resourceId: 'r-1',
        startsOn: '2026-12-01',
        endsOn: '2026-12-04',
        heldBy: GUEST,
      }),
    ).rejects.toBeInstanceOf(OccupancyConflictError);

    expect(calls()).toBe(1);
  });

  it('gives up after repeated serialization failures', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { repo, calls } = repoThatThrows([
      new SerializationError('busy'),
      new SerializationError('busy'),
      new SerializationError('busy'),
    ]);

    await expect(
      placeHold(repo)({
        resourceId: 'r-1',
        startsOn: '2026-12-01',
        endsOn: '2026-12-04',
        heldBy: GUEST,
      }),
    ).rejects.toBeInstanceOf(SerializationError);

    expect(calls()).toBe(3);
    vi.useRealTimers();
  });

  it('refuses a stay long enough to be a lease in disguise', async () => {
    const { repo } = repoThatThrows([]);
    await expect(
      placeHold(repo)({
        resourceId: 'r-1',
        startsOn: '2026-01-01',
        endsOn: '2026-12-01',
        heldBy: GUEST,
      }),
    ).rejects.toBeInstanceOf(StayTooLongError);
  });
});

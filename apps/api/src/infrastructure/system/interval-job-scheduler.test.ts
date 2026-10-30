import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntervalJobScheduler } from '@/infrastructure/system/interval-job-scheduler.adapter.ts';

afterEach(() => vi.useRealTimers());

describe('IntervalJobScheduler', () => {
  it('backs off failures and resumes the normal cadence after recovery', async () => {
    vi.useFakeTimers();
    const report = vi.fn();
    const missingSchema = { code: '42P01' };
    const run = vi.fn().mockRejectedValueOnce(missingSchema).mockRejectedValueOnce(missingSchema).mockResolvedValue(0);
    const job = new IntervalJobScheduler(report).every(1000, run);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(4);
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(missingSchema);
    job.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('does not overlap pending deliveries', async () => {
    vi.useFakeTimers();
    let complete!: () => void;
    const run = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    const job = new IntervalJobScheduler(vi.fn()).every(1000, run);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(1);
    complete();
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(2);
    complete();
    job.stop();
  });
});

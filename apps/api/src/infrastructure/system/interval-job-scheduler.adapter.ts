import type { JobScheduler, RecurringJob } from '@/application/ports/providers/job-scheduler.port.ts';

export class IntervalJobScheduler implements JobScheduler {
  constructor(private readonly onError: (error: unknown) => void) {}

  every(intervalMs: number, run: () => Promise<unknown>): RecurringJob {
    let running = false;
    let failures = 0;
    let retryAt = 0;
    const timer = setInterval(() => {
      if (running || Date.now() < retryAt) return;
      running = true;
      Promise.resolve().then(run)
        .then(() => {
          failures = 0;
          retryAt = 0;
        })
        .catch(error => {
          failures = Math.min(failures + 1, 16);
          retryAt = Date.now() + Math.min(intervalMs * 2 ** failures, 60_000);
          this.onError(error);
        })
        .finally(() => {
          running = false;
        });
    }, intervalMs);
    timer.unref();
    return { stop: () => clearInterval(timer) };
  }
}

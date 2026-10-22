import type { JobScheduler, RecurringJob } from '@/application/ports/providers/job-scheduler.port.ts';

export class IntervalJobScheduler implements JobScheduler {
  constructor(private readonly onError: (error: unknown) => void) {}

  every(intervalMs: number, run: () => Promise<unknown>): RecurringJob {
    let running = false;
    const timer = setInterval(() => {
      if (running) return;
      running = true;
      run()
        .catch(this.onError)
        .finally(() => {
          running = false;
        });
    }, intervalMs);
    timer.unref();
    return { stop: () => clearInterval(timer) };
  }
}

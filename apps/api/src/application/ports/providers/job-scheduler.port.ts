export interface RecurringJob {
  stop(): void;
}

export interface JobScheduler {
  every(intervalMs: number, run: () => Promise<unknown>): RecurringJob;
}

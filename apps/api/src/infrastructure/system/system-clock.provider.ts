import type { Clock } from '@/application/ports/providers/clock.port.ts';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

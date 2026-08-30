import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@/application/ports/providers/id-generator.port.ts';

export class UuidGenerator implements IdGenerator {
  generateId(): string {
    return randomUUID();
  }
}

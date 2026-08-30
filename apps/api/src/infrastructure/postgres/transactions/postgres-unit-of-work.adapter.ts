import type { UnitOfWork } from '@/application/ports/transactions/unit-of-work.port.ts';
import { sql } from '@/infrastructure/postgres/db.ts';

export class PostgresUnitOfWork implements UnitOfWork {
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return sql.begin(async () => {
      return work();
    }) as Promise<T>;
  }
}

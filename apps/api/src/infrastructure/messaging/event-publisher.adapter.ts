import type { EventPublisher } from '@/application/ports/messaging/event-publisher.port.ts';
import type { DomainEvent } from '@/domain/shared/domain-event.ts';

export class InProcessEventPublisher implements EventPublisher {
  async publish(event: DomainEvent): Promise<void> {
    void event;
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

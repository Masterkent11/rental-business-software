import { Inject, Logger, Module, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { AgentReferralsController } from './controllers/agent-referrals.controller.ts';
import {
  ASSIGN_LEAD,
  ISSUE_REFERRAL_CODE,
  JOB_SCHEDULER,
  REASSIGN_LEAD,
  RESOLVE_LEAD_ASSIGNMENT,
  SWEEP_LEAD_ASSIGNMENTS,
} from './assignment.tokens.ts';
import {
  AGENT_REPOSITORY,
  CLOCK,
  LEAD_ASSIGNMENT_REPOSITORY,
  LEAD_ASSIGNMENT_SETTINGS,
  NOTIFICATION_REPOSITORY,
  SHARED_LISTING_REPOSITORY,
  VIEWING_REPOSITORY,
} from '@/modules/shared/shared.tokens.ts';
import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { JobScheduler, RecurringJob } from '@/application/ports/providers/job-scheduler.port.ts';
import type { LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import { resolveLeadAssignment } from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { sweepLeadAssignments } from '@/application/assignment/sweep-lead-assignments/sweep-lead-assignments.use-case.ts';
import { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { issueReferralCode } from '@/application/assignment/issue-referral-code/issue-referral-code.use-case.ts';
import { IntervalJobScheduler } from '@/infrastructure/system/interval-job-scheduler.adapter.ts';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator.provider.ts';

const logger = new Logger('LeadAssignments');

@Module({
  controllers: [AgentReferralsController],
  providers: [
    {
      provide: RESOLVE_LEAD_ASSIGNMENT,
      inject: [LEAD_ASSIGNMENT_REPOSITORY, CLOCK],
      useFactory: (a: LeadAssignmentRepository, c: Clock) => resolveLeadAssignment(a, c),
    },
    {
      provide: REASSIGN_LEAD,
      inject: [
        LEAD_ASSIGNMENT_REPOSITORY,
        VIEWING_REPOSITORY,
        SHARED_LISTING_REPOSITORY,
        AGENT_REPOSITORY,
        NOTIFICATION_REPOSITORY,
        RESOLVE_LEAD_ASSIGNMENT,
        CLOCK,
        LEAD_ASSIGNMENT_SETTINGS,
      ],
      useFactory: (
        assignments: LeadAssignmentRepository,
        viewings: ViewingRepository,
        listings: ListingRepository,
        agents: AgentRepository,
        notifications: NotificationRepository,
        resolve: ReturnType<typeof resolveLeadAssignment>,
        clock: Clock,
        settings: LeadAssignmentSettings,
      ) => reassignLead({ assignments, viewings, listings, agents, notifications, resolve, clock, settings }),
    },
    {
      provide: SWEEP_LEAD_ASSIGNMENTS,
      inject: [
        LEAD_ASSIGNMENT_REPOSITORY,
        VIEWING_REPOSITORY,
        SHARED_LISTING_REPOSITORY,
        AGENT_REPOSITORY,
        NOTIFICATION_REPOSITORY,
        RESOLVE_LEAD_ASSIGNMENT,
        REASSIGN_LEAD,
        CLOCK,
        LEAD_ASSIGNMENT_SETTINGS,
      ],
      useFactory: (
        assignments: LeadAssignmentRepository,
        viewings: ViewingRepository,
        listings: ListingRepository,
        agents: AgentRepository,
        notifications: NotificationRepository,
        resolve: ReturnType<typeof resolveLeadAssignment>,
        reassign: ReturnType<typeof reassignLead>,
        clock: Clock,
        settings: LeadAssignmentSettings,
      ) => sweepLeadAssignments({ assignments, viewings, listings, agents, notifications, resolve, reassign, clock, settings }),
    },
    {
      provide: ASSIGN_LEAD,
      inject: [LEAD_ASSIGNMENT_REPOSITORY, RESOLVE_LEAD_ASSIGNMENT, REASSIGN_LEAD, CLOCK, LEAD_ASSIGNMENT_SETTINGS],
      useFactory: (
        assignments: LeadAssignmentRepository,
        resolve: ReturnType<typeof resolveLeadAssignment>,
        reassign: ReturnType<typeof reassignLead>,
        clock: Clock,
        settings: LeadAssignmentSettings,
      ) => assignLead({ assignments, resolve, reassign, clock, settings }),
    },
    {
      provide: ISSUE_REFERRAL_CODE,
      inject: [LEAD_ASSIGNMENT_REPOSITORY],
      useFactory: (a: LeadAssignmentRepository) => issueReferralCode(a, new UuidGenerator()),
    },
    {
      provide: JOB_SCHEDULER,
      useFactory: (): JobScheduler => new IntervalJobScheduler((error) => logger.error(error)),
    },
  ],
  exports: [RESOLVE_LEAD_ASSIGNMENT, REASSIGN_LEAD, ASSIGN_LEAD],
})
export class AssignmentModule implements OnApplicationBootstrap, OnModuleDestroy {
  private job: RecurringJob | null = null;

  constructor(
    @Inject(JOB_SCHEDULER) private readonly scheduler: JobScheduler,
    @Inject(SWEEP_LEAD_ASSIGNMENTS) private readonly sweep: ReturnType<typeof sweepLeadAssignments>,
    @Inject(LEAD_ASSIGNMENT_SETTINGS) private readonly settings: LeadAssignmentSettings,
  ) {}

  onApplicationBootstrap() {
    if (this.settings.sweepIntervalSeconds <= 0) return;
    this.job = this.scheduler.every(this.settings.sweepIntervalSeconds * 1000, this.sweep);
  }

  onModuleDestroy() {
    this.job?.stop();
  }
}

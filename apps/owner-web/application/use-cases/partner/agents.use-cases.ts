import type { PartnerRepositoryPort } from "../../ports/partner-repository.port";
import type { PartnerScope } from "../../../domain/workspace/workspace";
import type { AgentPermissions } from "../../../domain/listings/listing";
import {
  validateAgentForm,
  type AgentProfile,
  type AgentProfileForm,
  type PublicAgent,
  type Representation,
} from "../../../domain/agents/agent";
import type { AgentClient, AgentDashboard, AgentTask } from "../../../domain/agents/dashboard";
import type { PartnerAnalytics } from "../../../domain/analytics/analytics";

const assertValid = (form: AgentProfileForm) => {
  const errors = validateAgentForm(form);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
};

export class LoadAgentProfileUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(): Promise<AgentProfile | null> {
    return this.repository.getAgentProfile();
  }
}

export class RegisterAgentProfileUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(form: AgentProfileForm): Promise<AgentProfile> {
    assertValid(form);
    return this.repository.registerAgentProfile(form);
  }
}

export class UpdateAgentProfileUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(form: AgentProfileForm): Promise<AgentProfile> {
    assertValid(form);
    return this.repository.updateAgentProfile(form);
  }
}

export class RequestAgentVerificationUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(): Promise<AgentProfile> {
    return this.repository.requestAgentVerification();
  }
}

export class LoadAgentDashboardUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(): Promise<AgentDashboard> {
    return this.repository.getAgentDashboard();
  }
}

export class LoadAgentRepresentationsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(): Promise<readonly Representation[]> {
    return this.repository.getAgentRepresentations();
  }
}

export class RespondToRepresentationUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(representationId: string, accept: boolean): Promise<Representation> {
    return this.repository.respondToRepresentation(representationId, accept);
  }
}

export class EndRepresentationUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope, representationId: string, reason: string | null): Promise<Representation> {
    return this.repository.endRepresentation(scope, representationId, reason?.trim() || null);
  }
}

export class SearchAgentsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(organizationId: string, query: { q?: string; area?: string }): Promise<readonly PublicAgent[]> {
    return this.repository.searchAgents(organizationId, query);
  }
}

export class LoadOrganizationRepresentationsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(organizationId: string): Promise<readonly Representation[]> {
    return this.repository.getOrganizationRepresentations(organizationId);
  }
}

export class InviteAgentUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(organizationId: string, listingId: string, agentId: string, permissions: Partial<AgentPermissions>): Promise<Representation> {
    return this.repository.inviteAgent(organizationId, listingId, agentId, permissions);
  }
}

export class UpdateRepresentationPermissionsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(organizationId: string, representationId: string, permissions: AgentPermissions): Promise<Representation> {
    return this.repository.updateRepresentationPermissions(organizationId, representationId, permissions);
  }
}

export class LoadAgentClientsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(): Promise<readonly AgentClient[]> {
    return this.repository.getAgentClients();
  }
}

export class LoadAgentTasksUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(includeDone: boolean): Promise<readonly AgentTask[]> {
    return this.repository.getAgentTasks(includeDone);
  }
}

export class CreateAgentTaskUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(input: { title: string; dueAt: string; inquiryId: string | null }): Promise<AgentTask> {
    const title = input.title.trim();
    if (!title) throw new Error("Describe the follow-up");
    if (title.length > 200) throw new Error("Keep it under 200 characters");
    if (Number.isNaN(new Date(input.dueAt).getTime())) throw new Error("Choose when it is due");
    return this.repository.createAgentTask({ ...input, title, dueAt: new Date(input.dueAt).toISOString() });
  }
}

export class SetAgentTaskDoneUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(taskId: string, done: boolean): Promise<AgentTask> {
    return this.repository.setAgentTaskDone(taskId, done);
  }
}

export class RemoveAgentTaskUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(taskId: string): Promise<void> {
    return this.repository.removeAgentTask(taskId);
  }
}

export class LoadAnalyticsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  execute(scope: PartnerScope): Promise<PartnerAnalytics> {
    return this.repository.getAnalytics(scope);
  }
}

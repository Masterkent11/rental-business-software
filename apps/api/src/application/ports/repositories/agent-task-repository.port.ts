export interface AgentTask {
  readonly id: string;
  readonly title: string;
  readonly dueAt: Date;
  readonly doneAt: Date | null;
  readonly inquiryId: string | null;
  readonly customerName: string | null;
  readonly listingTitle: string | null;
  readonly createdAt: Date;
}

export interface AgentTaskRepository {
  list(agentUserId: string, includeDone: boolean): Promise<readonly AgentTask[]>;
  create(agentUserId: string, input: { readonly title: string; readonly dueAt: Date; readonly inquiryId: string | null }): Promise<AgentTask>;
  setDone(agentUserId: string, id: string, done: boolean): Promise<AgentTask | null>;
  remove(agentUserId: string, id: string): Promise<boolean>;
}

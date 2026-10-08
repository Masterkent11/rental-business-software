import type {
  AgentTask,
  AgentTaskRepository,
} from '@/application/ports/repositories/agent-task-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import { InquiryNotFoundError, InvalidInquiryError } from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const listAgentTasks =
  (tasks: AgentTaskRepository) =>
  async (input: { readonly principal: Principal; readonly includeDone: boolean }): Promise<readonly AgentTask[]> =>
    tasks.list(input.principal.userId, input.includeDone);

export const createAgentTask =
  (tasks: AgentTaskRepository, inquiries: InquiryRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly title: string;
    readonly dueAt: Date;
    readonly inquiryId: string | null;
  }): Promise<AgentTask> => {
    const title = input.title.replace(/\s+/g, ' ').trim();
    if (title.length < 1 || title.length > 200) throw new InvalidInquiryError('Describe the follow-up in under 200 characters');
    if (Number.isNaN(input.dueAt.getTime())) throw new InvalidInquiryError('Choose when the follow-up is due');
    if (input.inquiryId) {
      const inquiry = await inquiries.findForAgent(input.principal.userId, input.inquiryId);
      if (!inquiry) throw new InquiryNotFoundError('Lead not found');
    }
    return tasks.create(input.principal.userId, { title, dueAt: input.dueAt, inquiryId: input.inquiryId });
  };

export const setAgentTaskDone =
  (tasks: AgentTaskRepository) =>
  async (input: { readonly principal: Principal; readonly taskId: string; readonly done: boolean }): Promise<AgentTask> => {
    const updated = await tasks.setDone(input.principal.userId, input.taskId, input.done);
    if (!updated) throw new InquiryNotFoundError('Task not found');
    return updated;
  };

export const removeAgentTask =
  (tasks: AgentTaskRepository) =>
  async (input: { readonly principal: Principal; readonly taskId: string }): Promise<void> => {
    const removed = await tasks.remove(input.principal.userId, input.taskId);
    if (!removed) throw new InquiryNotFoundError('Task not found');
  };

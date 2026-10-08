import type postgres from 'postgres';
import type {
  AgentTask,
  AgentTaskRepository,
} from '@/application/ports/repositories/agent-task-repository.port.ts';
import { withUser } from '@/infrastructure/postgres/db.ts';

interface TaskRow {
  id: string;
  title: string;
  due_at: Date;
  done_at: Date | null;
  inquiry_id: string | null;
  customer_name: string | null;
  listing_title: string | null;
  created_at: Date;
}

const SELECT = (tx: postgres.TransactionSql) => tx`
  select t.id, t.title, t.due_at, t.done_at, t.inquiry_id, t.created_at,
         u.display_name as customer_name, l.title as listing_title
    from agent_tasks t
    left join inquiries i on i.id = t.inquiry_id
    left join user_profiles u on u.id = i.customer_id
    left join listings l on l.id = i.listing_id
`;

const toTask = (row: TaskRow): AgentTask => ({
  id: row.id,
  title: row.title,
  dueAt: row.due_at,
  doneAt: row.done_at,
  inquiryId: row.inquiry_id,
  customerName: row.customer_name,
  listingTitle: row.listing_title,
  createdAt: row.created_at,
});

export const postgresAgentTaskRepository = (): AgentTaskRepository => ({
  async list(agentUserId, includeDone) {
    return withUser(agentUserId, async (tx) => {
      const rows = await tx<TaskRow[]>`
        ${SELECT(tx)}
        where t.agent_id = app_private.current_app_agent()
          ${includeDone ? tx`` : tx`and t.done_at is null`}
        order by (t.done_at is not null), t.due_at asc
        limit 300
      `;
      return rows.map(toTask);
    });
  },

  async create(agentUserId, input) {
    return withUser(agentUserId, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        insert into agent_tasks (agent_id, inquiry_id, title, due_at)
        values (app_private.current_app_agent(), ${input.inquiryId}, ${input.title}, ${input.dueAt})
        returning id
      `;
      const [task] = await tx<TaskRow[]>`${SELECT(tx)} where t.id = ${row!.id}`;
      return toTask(task!);
    });
  },

  async setDone(agentUserId, id, done) {
    return withUser(agentUserId, async (tx) => {
      const updated = await tx`
        update agent_tasks set done_at = ${done ? tx`now()` : null}
         where id = ${id} and agent_id = app_private.current_app_agent()
        returning id
      `;
      if (updated.length === 0) return null;
      const [task] = await tx<TaskRow[]>`${SELECT(tx)} where t.id = ${id}`;
      return task ? toTask(task) : null;
    });
  },

  async remove(agentUserId, id) {
    return withUser(agentUserId, async (tx) => {
      const removed = await tx`
        delete from agent_tasks where id = ${id} and agent_id = app_private.current_app_agent() returning id
      `;
      return removed.length > 0;
    });
  },
});

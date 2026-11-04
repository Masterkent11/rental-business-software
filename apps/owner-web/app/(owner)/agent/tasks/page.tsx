"use client";

import { useEffect } from "react";
import { ListTodo, Trash2 } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, InlineError, Select, SkeletonRows, TextInput } from "@/components/owner/ui";
import { formatDateTime } from "@/lib/money";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/domain/agents/dashboard";
import { isOpenInquiry } from "@/domain/inquiries/inquiry";
import { useAgentStore } from "@/stores/use-agent-store";
import { useEngagementStore } from "@/stores/use-engagement-store";

export default function AgentTasksPage() {
  const {
    tasks,
    tasksLoaded,
    tasksError,
    showDone,
    taskTitle,
    taskDue,
    taskInquiryId,
    saving,
    busyId,
    actionError,
    loadTasks,
    setShowDone,
    setTaskField,
    setTaskInquiry,
    addTask,
    toggleTask,
    deleteTask,
  } = useAgentStore();
  const allInquiries = useEngagementStore((s) => s.inquiries);
  const inquiries = allInquiries.filter((i) => isOpenInquiry(i.status));

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const now = new Date();

  return (
    <Page>
      <TopBar title="Tasks" caption="Follow-ups you set for yourself. Due ones show on your dashboard.">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="size-4 accent-foreground" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show completed
        </label>
      </TopBar>
      <Card className="mb-6 p-5">
        <form
          noValidate
          className="grid gap-3 md:grid-cols-[1.6fr_1fr_1.2fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void addTask();
          }}
        >
          <Field label="Follow-up" htmlFor="taskTitle">
            <TextInput id="taskTitle" value={taskTitle} onChange={(e) => setTaskField("taskTitle", e.target.value)} placeholder="Send the reservation form" maxLength={200} />
          </Field>
          <Field label="Due" htmlFor="taskDue">
            <TextInput id="taskDue" type="datetime-local" value={taskDue} onChange={(e) => setTaskField("taskDue", e.target.value)} />
          </Field>
          <Field label="Lead (optional)" htmlFor="taskInquiry">
            <Select id="taskInquiry" value={taskInquiryId ?? ""} onChange={(e) => setTaskInquiry(e.target.value || null)}>
              <option value="">No lead</option>
              {inquiries.map((inquiry) => (
                <option key={inquiry.id} value={inquiry.id}>
                  {inquiry.customerName} · {inquiry.listingTitle}
                </option>
              ))}
            </Select>
          </Field>
          <Btn type="submit" busy={saving} disabled={!taskTitle.trim() || !taskDue}>
            Add
          </Btn>
        </form>
        <div className="mt-3">
          <InlineError message={actionError} />
        </div>
      </Card>
      <Card>
        {!tasksLoaded ? (
          <SkeletonRows rows={4} />
        ) : tasksError ? (
          <ErrorState message={tasksError} onRetry={() => void loadTasks()} />
        ) : tasks.length === 0 ? (
          <EmptyState icon={<ListTodo className="size-5" aria-hidden />} title="No follow-ups" body="Add a follow-up above to remind yourself to call back, send documents or check in after a viewing." />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => {
              const overdue = isOverdue(task, now);
              return (
                <li key={task.id} id={`search-task-${task.id}`} className="flex items-center gap-4 px-5 py-3.5">
                  <input
                    type="checkbox"
                    className="size-4 accent-foreground"
                    checked={task.doneAt !== null}
                    disabled={busyId === task.id}
                    onChange={() => void toggleTask(task)}
                    aria-label={task.doneAt ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[13.5px] font-medium", task.doneAt && "text-muted line-through")}>{task.title}</p>
                    <p className="truncate text-[12px] text-muted">
                      {formatDateTime(task.dueAt)}
                      {task.customerName ? ` · ${task.customerName}` : ""}
                      {task.listingTitle ? ` · ${task.listingTitle}` : ""}
                    </p>
                  </div>
                  {overdue ? <Badge tone="bad">Overdue</Badge> : null}
                  <button
                    type="button"
                    onClick={() => void deleteTask(task.id)}
                    disabled={busyId === task.id}
                    aria-label={`Delete ${task.title}`}
                    className="focusable rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Page>
  );
}

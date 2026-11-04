import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import { useSessionStore } from "./use-session-store";
import {
  agentFormFrom,
  emptyAgentForm,
  validateAgentForm,
  type AgentProfile,
  type AgentProfileErrors,
  type AgentProfileForm,
  type Representation,
} from "../domain/agents/agent";
import type { AgentClient, AgentDashboard, AgentTask } from "../domain/agents/dashboard";

interface AgentState {
  reset: () => void;
  dashboard: AgentDashboard | null;
  dashboardError: string | null;
  representations: readonly Representation[];
  representationsLoaded: boolean;
  representationsError: string | null;
  clients: readonly AgentClient[];
  clientsLoaded: boolean;
  clientsError: string | null;
  tasks: readonly AgentTask[];
  tasksLoaded: boolean;
  tasksError: string | null;
  showDone: boolean;
  taskTitle: string;
  taskDue: string;
  taskInquiryId: string | null;
  profile: AgentProfile | null;
  profileLoaded: boolean;
  form: AgentProfileForm;
  formErrors: AgentProfileErrors;
  drafts: { specialties: string; areasServed: string; languages: string };
  saving: boolean;
  saveError: string | null;
  savedAt: number | null;
  busyId: string | null;
  actionError: string | null;
  confirmEndId: string | null;

  askEnd: (id: string | null) => void;
  loadDashboard: () => Promise<void>;
  loadRepresentations: () => Promise<void>;
  respond: (id: string, accept: boolean) => Promise<boolean>;
  endRepresentation: (id: string) => Promise<void>;
  loadClients: () => Promise<void>;
  loadTasks: () => Promise<void>;
  setShowDone: (value: boolean) => void;
  setTaskField: (key: "taskTitle" | "taskDue", value: string) => void;
  setTaskInquiry: (id: string | null) => void;
  addTask: () => Promise<boolean>;
  toggleTask: (task: AgentTask) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  loadProfile: (fallbackName: string) => Promise<void>;
  setFormField: <K extends keyof AgentProfileForm>(key: K, value: AgentProfileForm[K]) => void;
  setDraft: (key: "specialties" | "areasServed" | "languages", value: string) => void;
  addListItem: (key: "specialties" | "areasServed" | "languages") => void;
  removeListItem: (key: "specialties" | "areasServed" | "languages", index: number) => void;
  saveProfile: () => Promise<AgentProfile | null>;
  requestVerification: () => Promise<void>;
}

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const tomorrowAtNine = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
};

const emptyAgentState = () => ({
  dashboard: null, dashboardError: null, representations: [], representationsLoaded: false,
  representationsError: null, clients: [], clientsLoaded: false, clientsError: null,
  tasks: [], tasksLoaded: false, tasksError: null, showDone: false, taskTitle: "",
  taskDue: tomorrowAtNine(), taskInquiryId: null, profile: null, profileLoaded: false,
  form: emptyAgentForm(), formErrors: {}, drafts: { specialties: "", areasServed: "", languages: "" },
  saving: false, saveError: null, savedAt: null, busyId: null, actionError: null, confirmEndId: null,
});

type AgentCommit = (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void;

export const useAgentStore = create<AgentState>((set, get) => {
  let epoch = 0;
  const reads = new Map<string, number>();
  const scoped = <T>(operation: (commit: AgentCommit) => Promise<T>, fallback: T, enrollment = false): Promise<T> => {
    const session = useSessionStore.getState();
    if (session.status !== "authenticated" || !session.user || (!enrollment && session.activeWorkspace?.kind !== "AGENT")) return Promise.resolve(fallback);
    const version = epoch;
    const commit: AgentCommit = partial => {
      if (version === epoch) set(partial);
    };
    return operation(commit).then(result => version === epoch ? result : fallback);
  };
  const read = (key: string, operation: (commit: AgentCommit) => Promise<void>, enrollment = false) => {
    const version = (reads.get(key) ?? 0) + 1;
    reads.set(key, version);
    return scoped(async commit => {
      const latest: AgentCommit = partial => {
        if (reads.get(key) === version) commit(partial);
      };
      await operation(latest);
    }, undefined, enrollment);
  };
  return ({
  ...emptyAgentState(),
  reset: () => { ++epoch; reads.clear(); set(emptyAgentState()); },

  askEnd: (confirmEndId) => set({ confirmEndId, actionError: null }),

  loadDashboard: () => read("loadDashboard", async commit => {
    try {
      commit({ dashboard: await container.loadAgentDashboardUseCase.execute(), dashboardError: null });
    } catch (error) {
      commit({ dashboardError: messageOf(error, "Could not load your dashboard") });
    }
  }),

  loadRepresentations: () => read("loadRepresentations", async commit => {
    try {
      const representations = await container.loadAgentRepresentationsUseCase.execute();
      commit({ representations, representationsLoaded: true, representationsError: null });
    } catch (error) {
      commit({ representationsLoaded: true, representationsError: messageOf(error, "Could not load your properties") });
    }
  }),

  respond: (id, accept) => scoped(async commit => {
    commit({ busyId: id, actionError: null });
    try {
      const updated = await container.respondToRepresentationUseCase.execute(id, accept);
      commit((state) => ({ busyId: null, representations: state.representations.map((r) => (r.id === id ? updated : r)) }));
      return true;
    } catch (error) {
      commit({ busyId: null, actionError: messageOf(error, "Could not answer the invitation") });
      return false;
    }
  }, false),

  endRepresentation: (id) => scoped(async commit => {
    commit({ busyId: id, actionError: null });
    try {
      const scope = useSessionStore.getState().scope;
      if (scope?.kind !== "AGENT") throw new Error("Switch to your agent workspace to end a representation");
      const updated = await container.endRepresentationUseCase.execute(scope, id, "Ended by the agent");
      commit((state) => ({ busyId: null, confirmEndId: null, representations: state.representations.map((r) => (r.id === id ? updated : r)) }));
    } catch (error) {
      commit({ busyId: null, actionError: messageOf(error, "Could not end the representation") });
    }
  }, undefined),

  loadClients: () => read("loadClients", async commit => {
    try {
      commit({ clients: await container.loadAgentClientsUseCase.execute(), clientsLoaded: true, clientsError: null });
    } catch (error) {
      commit({ clientsLoaded: true, clientsError: messageOf(error, "Could not load clients") });
    }
  }),

  loadTasks: () => read("loadTasks", async commit => {
    try {
      commit({ tasks: await container.loadAgentTasksUseCase.execute(get().showDone), tasksLoaded: true, tasksError: null });
    } catch (error) {
      commit({ tasksLoaded: true, tasksError: messageOf(error, "Could not load tasks") });
    }
  }),

  setShowDone: (showDone) => {
    set({ showDone });
    void get().loadTasks();
  },

  setTaskField: (key, value) => set({ [key]: value } as Partial<AgentState>),
  setTaskInquiry: (taskInquiryId) => set({ taskInquiryId }),

  addTask: () => scoped(async commit => {
    commit({ saving: true, actionError: null });
    try {
      const task = await container.createAgentTaskUseCase.execute({
        title: get().taskTitle,
        dueAt: get().taskDue,
        inquiryId: get().taskInquiryId,
      });
      commit((state) => ({
        saving: false,
        taskTitle: "",
        taskDue: tomorrowAtNine(),
        taskInquiryId: null,
        tasks: [...state.tasks, task].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      }));
      return true;
    } catch (error) {
      commit({ saving: false, actionError: messageOf(error, "Could not add the follow-up") });
      return false;
    }
  }, false),

  toggleTask: (task) => scoped(async commit => {
    commit({ busyId: task.id, actionError: null });
    try {
      const updated = await container.setAgentTaskDoneUseCase.execute(task.id, task.doneAt === null);
      commit((state) => ({
        busyId: null,
        tasks: state.showDone ? state.tasks.map((t) => (t.id === task.id ? updated : t)) : state.tasks.filter((t) => t.id !== task.id || updated.doneAt === null),
      }));
    } catch (error) {
      commit({ busyId: null, actionError: messageOf(error, "Could not update the follow-up") });
    }
  }, undefined),

  deleteTask: (id) => scoped(async commit => {
    commit({ busyId: id, actionError: null });
    try {
      await container.removeAgentTaskUseCase.execute(id);
      commit((state) => ({ busyId: null, tasks: state.tasks.filter((t) => t.id !== id) }));
    } catch (error) {
      commit({ busyId: null, actionError: messageOf(error, "Could not delete the follow-up") });
    }
  }, undefined),

  loadProfile: (fallbackName) => read("loadProfile", async commit => {
    try {
      const profile = await container.loadAgentProfileUseCase.execute();
      commit({ profile, profileLoaded: true, form: profile ? agentFormFrom(profile) : emptyAgentForm(fallbackName), saveError: null });
    } catch (error) {
      commit({ profileLoaded: true, saveError: messageOf(error, "Could not load your profile") });
    }
  }, true),

  setFormField: (key, value) =>
    set((state) => ({ form: { ...state.form, [key]: value }, formErrors: { ...state.formErrors, [key]: undefined } })),

  setDraft: (key, value) => set((state) => ({ drafts: { ...state.drafts, [key]: value } })),

  addListItem: (key) => {
    const value = get().drafts[key].trim();
    if (!value) return;
    set((state) => ({
      form: state.form[key].some((v) => v.toLowerCase() === value.toLowerCase()) ? state.form : { ...state.form, [key]: [...state.form[key], value] },
      drafts: { ...state.drafts, [key]: "" },
    }));
  },

  removeListItem: (key, index) => set((state) => ({ form: { ...state.form, [key]: state.form[key].filter((_, i) => i !== index) } })),

  saveProfile: () => scoped(async commit => {
    const errors = validateAgentForm(get().form);
    if (Object.keys(errors).length > 0) {
      commit({ formErrors: errors });
      return null;
    }
    commit({ saving: true, saveError: null });
    try {
      const profile = get().profile
        ? await container.updateAgentProfileUseCase.execute(get().form)
        : await container.registerAgentProfileUseCase.execute(get().form);
      commit({ saving: false, profile, form: agentFormFrom(profile), savedAt: Date.now() });
      return profile;
    } catch (error) {
      commit({ saving: false, saveError: messageOf(error, "Could not save your profile") });
      return null;
    }
  }, null, true),

  requestVerification: () => scoped(async commit => {
    commit({ saving: true, saveError: null });
    try {
      const profile = await container.requestAgentVerificationUseCase.execute();
      commit({ saving: false, profile });
    } catch (error) {
      commit({ saving: false, saveError: messageOf(error, "Could not request verification") });
    }
  }, undefined),
  });
});

useSessionStore.subscribe((state, previous) => {
  if (state.status !== "authenticated" || state.user?.id !== previous.user?.id || state.activeWorkspace?.key !== previous.activeWorkspace?.key || state.activeWorkspace?.kind === "AGENT" && previous.activeWorkspace?.kind === "AGENT" && state.activeWorkspace.agentId !== previous.activeWorkspace.agentId) {
    useAgentStore.getState().reset();
  }
});

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

export const useAgentStore = create<AgentState>((set, get) => ({
  dashboard: null,
  dashboardError: null,
  representations: [],
  representationsLoaded: false,
  representationsError: null,
  clients: [],
  clientsLoaded: false,
  clientsError: null,
  tasks: [],
  tasksLoaded: false,
  tasksError: null,
  showDone: false,
  taskTitle: "",
  taskDue: tomorrowAtNine(),
  taskInquiryId: null,
  profile: null,
  profileLoaded: false,
  form: emptyAgentForm(),
  formErrors: {},
  drafts: { specialties: "", areasServed: "", languages: "" },
  saving: false,
  saveError: null,
  savedAt: null,
  busyId: null,
  actionError: null,
  confirmEndId: null,

  askEnd: (confirmEndId) => set({ confirmEndId, actionError: null }),

  loadDashboard: async () => {
    try {
      set({ dashboard: await container.loadAgentDashboardUseCase.execute(), dashboardError: null });
    } catch (error) {
      set({ dashboardError: messageOf(error, "Could not load your dashboard") });
    }
  },

  loadRepresentations: async () => {
    try {
      const representations = await container.loadAgentRepresentationsUseCase.execute();
      set({ representations, representationsLoaded: true, representationsError: null });
    } catch (error) {
      set({ representationsLoaded: true, representationsError: messageOf(error, "Could not load your properties") });
    }
  },

  respond: async (id, accept) => {
    set({ busyId: id, actionError: null });
    try {
      const updated = await container.respondToRepresentationUseCase.execute(id, accept);
      set((state) => ({ busyId: null, representations: state.representations.map((r) => (r.id === id ? updated : r)) }));
      return true;
    } catch (error) {
      set({ busyId: null, actionError: messageOf(error, "Could not answer the invitation") });
      return false;
    }
  },

  endRepresentation: async (id) => {
    set({ busyId: id, actionError: null });
    try {
      const scope = useSessionStore.getState().scope;
      if (scope?.kind !== "AGENT") throw new Error("Switch to your agent workspace to end a representation");
      const updated = await container.endRepresentationUseCase.execute(scope, id, "Ended by the agent");
      set((state) => ({ busyId: null, confirmEndId: null, representations: state.representations.map((r) => (r.id === id ? updated : r)) }));
    } catch (error) {
      set({ busyId: null, actionError: messageOf(error, "Could not end the representation") });
    }
  },

  loadClients: async () => {
    try {
      set({ clients: await container.loadAgentClientsUseCase.execute(), clientsLoaded: true, clientsError: null });
    } catch (error) {
      set({ clientsLoaded: true, clientsError: messageOf(error, "Could not load clients") });
    }
  },

  loadTasks: async () => {
    try {
      set({ tasks: await container.loadAgentTasksUseCase.execute(get().showDone), tasksLoaded: true, tasksError: null });
    } catch (error) {
      set({ tasksLoaded: true, tasksError: messageOf(error, "Could not load tasks") });
    }
  },

  setShowDone: (showDone) => {
    set({ showDone });
    void get().loadTasks();
  },

  setTaskField: (key, value) => set({ [key]: value } as Partial<AgentState>),
  setTaskInquiry: (taskInquiryId) => set({ taskInquiryId }),

  addTask: async () => {
    set({ saving: true, actionError: null });
    try {
      const task = await container.createAgentTaskUseCase.execute({
        title: get().taskTitle,
        dueAt: get().taskDue,
        inquiryId: get().taskInquiryId,
      });
      set((state) => ({
        saving: false,
        taskTitle: "",
        taskDue: tomorrowAtNine(),
        taskInquiryId: null,
        tasks: [...state.tasks, task].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      }));
      return true;
    } catch (error) {
      set({ saving: false, actionError: messageOf(error, "Could not add the follow-up") });
      return false;
    }
  },

  toggleTask: async (task) => {
    set({ busyId: task.id, actionError: null });
    try {
      const updated = await container.setAgentTaskDoneUseCase.execute(task.id, task.doneAt === null);
      set((state) => ({
        busyId: null,
        tasks: state.showDone ? state.tasks.map((t) => (t.id === task.id ? updated : t)) : state.tasks.filter((t) => t.id !== task.id || updated.doneAt === null),
      }));
    } catch (error) {
      set({ busyId: null, actionError: messageOf(error, "Could not update the follow-up") });
    }
  },

  deleteTask: async (id) => {
    set({ busyId: id, actionError: null });
    try {
      await container.removeAgentTaskUseCase.execute(id);
      set((state) => ({ busyId: null, tasks: state.tasks.filter((t) => t.id !== id) }));
    } catch (error) {
      set({ busyId: null, actionError: messageOf(error, "Could not delete the follow-up") });
    }
  },

  loadProfile: async (fallbackName) => {
    try {
      const profile = await container.loadAgentProfileUseCase.execute();
      set({ profile, profileLoaded: true, form: profile ? agentFormFrom(profile) : emptyAgentForm(fallbackName), saveError: null });
    } catch (error) {
      set({ profileLoaded: true, saveError: messageOf(error, "Could not load your profile") });
    }
  },

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

  saveProfile: async () => {
    const errors = validateAgentForm(get().form);
    if (Object.keys(errors).length > 0) {
      set({ formErrors: errors });
      return null;
    }
    set({ saving: true, saveError: null });
    try {
      const profile = get().profile
        ? await container.updateAgentProfileUseCase.execute(get().form)
        : await container.registerAgentProfileUseCase.execute(get().form);
      set({ saving: false, profile, form: agentFormFrom(profile), savedAt: Date.now() });
      return profile;
    } catch (error) {
      set({ saving: false, saveError: messageOf(error, "Could not save your profile") });
      return null;
    }
  },

  requestVerification: async () => {
    set({ saving: true, saveError: null });
    try {
      const profile = await container.requestAgentVerificationUseCase.execute();
      set({ saving: false, profile });
    } catch (error) {
      set({ saving: false, saveError: messageOf(error, "Could not request verification") });
    }
  },
}));

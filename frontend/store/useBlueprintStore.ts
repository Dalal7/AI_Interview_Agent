import { create } from "zustand";
import { InterviewBlueprint, ChatMessage } from "../types/blueprint";
import { templates } from "../utils/templates";
import { validateBlueprint, ValidationReport } from "../utils/schema";
import { apiService } from "../services/api";

interface BlueprintState {
  blueprint: InterviewBlueprint;
  past: InterviewBlueprint[];
  future: InterviewBlueprint[];
  messages: ChatMessage[];
  isLoading: boolean;
  validationReport: ValidationReport;
  loadedSource: string | null;

  // Actions
  updateBlueprint: (updater: (prev: InterviewBlueprint) => Partial<InterviewBlueprint> | InterviewBlueprint) => void;
  updateField: (path: string, value: any) => void;
  setBlueprint: (newBlueprint: InterviewBlueprint, clearHistory?: boolean) => void;
  setLoadedSource: (source: string | null) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  loadTemplate: (templateId: string) => void;
  
  // Chat Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  sendMessageToAI: (prompt: string) => Promise<void>;
  clearChat: () => void;
  setLoading: (loading: boolean) => void;

  // Database Actions
  fetchBlueprint: () => Promise<void>;
  publishBlueprint: () => Promise<void>;
  deleteBlueprint: () => Promise<void>;
}

const defaultBlueprint: InterviewBlueprint = {
  program: {
    name: "New Training Cohort",
    description: "Describe your cohort program and target learning path.",
    type: "Full-Time",
    duration_weeks: 12,
    cohort_size: 30
  },
  candidate_profile: {
    target_audience: ["Learners"],
    experience_level: "Entry Level",
    minimum_requirements: ["Basic computer skills"]
  },
  interview_objective: {
    purpose: "Evaluate fit and motivation for the training program.",
    success_definition: "Candidate shows high curiosity, basic coding aptitude, and good teamwork."
  },
  interview_structure: {
    type: "semi_structured",
    total_duration_minutes: 45,
    sections: [
      {
        name: "Introduction",
        duration_minutes: 10,
        objective: "Introduce goals and check background details.",
        focus_competencies: ["Communication"]
      },
      {
        name: "Technical Logic Warmup",
        duration_minutes: 25,
        objective: "Go through simple logic and puzzle problems.",
        focus_competencies: ["Technical", "Problem Solving"]
      },
      {
        name: "Conclusion & Q&A",
        duration_minutes: 10,
        objective: "Share cohort details and wrap up.",
        focus_competencies: ["Communication"]
      }
    ]
  },
  competencies: [
    { name: "Technical", weight: 40, description: "Ability to apply logical concepts." },
    { name: "Problem Solving", weight: 30, description: "Structured thinking and breaking down problems." },
    { name: "Communication", weight: 30, description: "Clarity of thoughts and collaboration style." }
  ],
  skills: {
    required: ["Analytical Thinking"],
    preferred: ["Familiarity with Computers"],
    bonus: ["Self-learning projects"]
  },
  question_strategy: {
    mode: "hybrid",
    adaptive_enabled: true,
    follow_up_depth_limit: 3
  },
  evaluation_rubric: {
    criteria: [
      { name: "Technical Fit", weight: 40, scale: "0-5" },
      { name: "Problem Solving Fit", weight: 30, scale: "0-5" },
      { name: "Motivation & Drive", weight: 30, scale: "0-5" }
    ]
  },
  scoring: {
    overall_scale: 100,
    pass_threshold: 60,
    weights: {
      technical: 40,
      communication: 30,
      problem_solving: 30
    }
  },
  decision_rules: {
    auto_accept_threshold: 80,
    auto_reject_threshold: 50,
    human_review_range: { min: 50, max: 80 }
  },
  agent_configuration: {
    tone: "friendly",
    verbosity: "medium",
    language: "English"
  }
};

const initialChatMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hi! I am your AI Interview Blueprint Compiler. Let's design a high-quality interview process. You can describe what you need (e.g., 'Make an interview blueprint for a 12-week Full Stack web bootcamp focusing on Javascript and SQL') and I will compile it! How can I help you today?",
    timestamp: new Date().toISOString()
  }
];

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function updateNestedField(obj: any, path: string, value: any): any {
  const newObj = deepClone(obj);
  const keys = path.split(".");
  let current = newObj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key.includes("[") && key.includes("]")) {
      const arrayKey = key.split("[")[0];
      const index = parseInt(key.split("[")[1].split("]")[0], 10);
      if (!current[arrayKey]) current[arrayKey] = [];
      if (!current[arrayKey][index]) current[arrayKey][index] = {};
      current = current[arrayKey][index];
    } else {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
  }
  
  const lastKey = keys[keys.length - 1];
  if (lastKey.includes("[") && lastKey.includes("]")) {
    const arrayKey = lastKey.split("[")[0];
    const index = parseInt(lastKey.split("[")[1].split("]")[0], 10);
    if (!current[arrayKey]) current[arrayKey] = [];
    current[arrayKey][index] = value;
  } else {
    current[lastKey] = value;
  }
  
  return newObj;
}

function getInitialState() {
  if (typeof window !== "undefined") {
    try {
      const savedBlueprint = localStorage.getItem("interview_blueprint");
      const savedMessages = localStorage.getItem("interview_blueprint_chat");
      const savedSource = localStorage.getItem("interview_blueprint_source");
      
      const blueprint = savedBlueprint ? JSON.parse(savedBlueprint) : deepClone(defaultBlueprint);
      const messages = savedMessages ? JSON.parse(savedMessages) : initialChatMessages;
      const loadedSource = savedSource || null;
      
      return {
        blueprint,
        messages,
        loadedSource,
        validationReport: validateBlueprint(blueprint)
      };
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
  }
  
  return {
    blueprint: deepClone(defaultBlueprint),
    messages: initialChatMessages,
    loadedSource: null,
    validationReport: validateBlueprint(defaultBlueprint)
  };
}

export const useBlueprintStore = create<BlueprintState>((set, get) => {
  const initialState = getInitialState();

  const syncLocalStorage = (blueprint: InterviewBlueprint, messages: ChatMessage[], source?: string | null) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("interview_blueprint", JSON.stringify(blueprint));
        localStorage.setItem("interview_blueprint_chat", JSON.stringify(messages));
        if (source !== undefined) {
          if (source) {
            localStorage.setItem("interview_blueprint_source", source);
          } else {
            localStorage.removeItem("interview_blueprint_source");
          }
        }
      } catch (e) {
        console.error("Failed to write state to localStorage", e);
      }
    }
  };

  const getModifiedSource = (currentSource: string | null) => {
    if (!currentSource) return "Modified Blueprint";
    if (currentSource.endsWith(" (Modified)")) return currentSource;
    return `${currentSource} (Modified)`;
  };

  return {
    blueprint: initialState.blueprint,
    past: [],
    future: [],
    messages: initialState.messages,
    isLoading: false,
    validationReport: initialState.validationReport,
    loadedSource: initialState.loadedSource,

    updateBlueprint: (updater) => {
      set((state) => {
        const nextBlueprint = deepClone(state.blueprint);
        const update = updater(nextBlueprint);
        
        // Deep merge updates recursively or just overwrite fields
        const mergedBlueprint = { ...nextBlueprint, ...update };
        const report = validateBlueprint(mergedBlueprint);
        
        const newPast = [...state.past, state.blueprint];
        if (newPast.length > 50) newPast.shift();

        const nextSource = getModifiedSource(state.loadedSource);
        syncLocalStorage(mergedBlueprint, state.messages, nextSource);

        return {
          blueprint: mergedBlueprint,
          past: newPast,
          future: [],
          validationReport: report,
          loadedSource: nextSource
        };
      });
    },

    updateField: (path, value) => {
      set((state) => {
        const nextBlueprint = updateNestedField(state.blueprint, path, value);
        const report = validateBlueprint(nextBlueprint);
        
        const newPast = [...state.past, state.blueprint];
        if (newPast.length > 50) newPast.shift();

        const nextSource = getModifiedSource(state.loadedSource);
        syncLocalStorage(nextBlueprint, state.messages, nextSource);

        return {
          blueprint: nextBlueprint,
          past: newPast,
          future: [],
          validationReport: report,
          loadedSource: nextSource
        };
      });
    },

    setBlueprint: (newBlueprint, clearHistory = false) => {
      set((state) => {
        const cloned = deepClone(newBlueprint);
        const report = validateBlueprint(cloned);
        
        const nextPast = clearHistory ? [] : [...state.past, state.blueprint];
        if (nextPast.length > 50) nextPast.shift();

        syncLocalStorage(cloned, state.messages);

        return {
          blueprint: cloned,
          past: nextPast,
          future: clearHistory ? [] : state.future,
          validationReport: report
        };
      });
    },

    setLoadedSource: (source) => {
      set((state) => {
        syncLocalStorage(state.blueprint, state.messages, source);
        return { loadedSource: source };
      });
    },

    undo: () => {
      set((state) => {
        if (state.past.length === 0) return {};
        
        const prev = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        const newFuture = [state.blueprint, ...state.future];
        const report = validateBlueprint(prev);

        const nextSource = getModifiedSource(state.loadedSource);
        syncLocalStorage(prev, state.messages, nextSource);

        return {
          blueprint: prev,
          past: newPast,
          future: newFuture,
          validationReport: report,
          loadedSource: nextSource
        };
      });
    },

    redo: () => {
      set((state) => {
        if (state.future.length === 0) return {};
        
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        const newPast = [...state.past, state.blueprint];
        const report = validateBlueprint(next);

        const nextSource = getModifiedSource(state.loadedSource);
        syncLocalStorage(next, state.messages, nextSource);

        return {
          blueprint: next,
          past: newPast,
          future: newFuture,
          validationReport: report,
          loadedSource: nextSource
        };
      });
    },

    reset: () => {
      set((state) => {
        const clonedDefault = deepClone(defaultBlueprint);
        const report = validateBlueprint(clonedDefault);
        const newPast = [...state.past, state.blueprint];

        syncLocalStorage(clonedDefault, state.messages, null);

        return {
          blueprint: clonedDefault,
          past: newPast,
          future: [],
          validationReport: report,
          loadedSource: null
        };
      });
    },

    loadTemplate: (templateId) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        set((state) => {
          const loaded = deepClone(template.blueprint);
          const report = validateBlueprint(loaded);
          const newPast = [...state.past, state.blueprint];

          syncLocalStorage(loaded, state.messages, template.name);

          return {
            blueprint: loaded,
            past: newPast,
            future: [],
            validationReport: report,
            loadedSource: template.name
          };
        });
      }
    },

    addMessage: (msg) => {
      set((state) => {
        const newMessage: ChatMessage = {
          ...msg,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString()
        };
        const nextMessages = [...state.messages, newMessage];
        
        syncLocalStorage(state.blueprint, nextMessages);
        
        return { messages: nextMessages };
      });
    },

    sendMessageToAI: async (prompt) => {
      set({ isLoading: true });
      const { blueprint, messages, addMessage, updateBlueprint } = get();
      
      addMessage({ role: "user", content: prompt });
      
      try {
        const response = await apiService.compileBlueprintChat(blueprint, messages, prompt);
        
        addMessage({
          role: "assistant",
          content: response.message || "I have updated the blueprint.",
          blueprintUpdate: response.blueprintUpdate,
          suggestedQuestions: response.suggestedQuestions,
          validationWarnings: response.validationWarnings
        });

        if (response.blueprintUpdate && Object.keys(response.blueprintUpdate).length > 0) {
          updateBlueprint((prev) => response.blueprintUpdate);
        }
      } catch (err: any) {
        addMessage({
          role: "assistant",
          content: `Error compiling blueprint update: ${err.message || err}`
        });
      } finally {
        set({ isLoading: false });
      }
    },

    clearChat: () => {
      set((state) => {
        syncLocalStorage(state.blueprint, initialChatMessages);
        return { messages: initialChatMessages };
      });
    },

    setLoading: (loading) => {
      set({ isLoading: loading });
    },

    fetchBlueprint: async () => {
      set({ isLoading: true });
      try {
        const data = await apiService.getBlueprint();
        if (data && data.blueprint) {
          set({
            blueprint: data.blueprint,
            validationReport: validateBlueprint(data.blueprint),
            loadedSource: "Active Published Database"
          });
        }
      } catch (err) {
        console.error("Failed to fetch blueprint from backend:", err);
      } finally {
        set({ isLoading: false });
      }
    },

    publishBlueprint: async () => {
      const { blueprint } = get();
      set({ isLoading: true });
      try {
        await apiService.saveBlueprint(blueprint);
      } catch (err) {
        console.error("Failed to publish blueprint to backend:", err);
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    deleteBlueprint: async () => {
      set({ isLoading: true });
      try {
        await apiService.deleteBlueprint();
        const clonedDefault = deepClone(defaultBlueprint);
        const report = validateBlueprint(clonedDefault);
        syncLocalStorage(clonedDefault, get().messages, null);
        set({
          blueprint: clonedDefault,
          validationReport: report,
          loadedSource: null
        });
      } catch (err) {
        console.error("Failed to delete blueprint from backend:", err);
        throw err;
      } finally {
        set({ isLoading: false });
      }
    }
  };
});

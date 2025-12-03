"use client";

import { create } from "zustand";
import type { Message, ThreadMetadata, DeepResearchParams } from "@/lib/types";

interface AppStore {
  // Current chat state
  messages: Message[];
  isStreaming: boolean;
  currentThreadId: string | null;

  // Threads management
  threads: Record<string, ThreadMetadata>;
  serverThreadsLoaded: boolean;

  // Configuration
  apiUrl: string;
  assistantId: string;
  apiKey: string | null;
  deepResearchParams: DeepResearchParams;
  useQuickMode: boolean;
  useDeepResearchMode: boolean;

  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastAssistantMessage: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setCurrentThreadId: (threadId: string | null) => void;

  setThreads: (threads: Record<string, ThreadMetadata>) => void;
  addThread: (threadId: string, metadata: ThreadMetadata) => void;
  updateThread: (threadId: string, metadata: Partial<ThreadMetadata>) => void;
  deleteThread: (threadId: string) => void;
  updateThreadMetadata: (
    threadId: string,
    role: "user" | "assistant",
    content: string
  ) => void;
  setServerThreadsLoaded: (loaded: boolean) => void;

  setApiUrl: (url: string) => void;
  setAssistantId: (id: string) => void;
  setApiKey: (key: string | null) => void;
  setDeepResearchParams: (params: DeepResearchParams) => void;
  setUseQuickMode: (useQuickMode: boolean) => void;
  setUseDeepResearchMode: (useDeepResearchMode: boolean) => void;
  getActiveParams: () => DeepResearchParams;

  reset: () => void;
}

const defaultApiUrl =
  process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://127.0.0.1:2024";
const defaultAssistantId =
  process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || "Deep Researcher";

const quickModeParams: DeepResearchParams = {
  max_structured_output_retries: 1,
  allow_clarification: false,
  max_concurrent_research_units: 5,
  max_researcher_iterations: 1,
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  messages: [],
  isStreaming: false,
  currentThreadId: null,
  threads: {},
  serverThreadsLoaded: false,
  apiUrl: defaultApiUrl,
  assistantId: defaultAssistantId,
  apiKey: null,
  deepResearchParams: {
    max_structured_output_retries: 3,
    allow_clarification: true,
    max_concurrent_research_units: 5,
    max_researcher_iterations: 10,
  },
  useQuickMode: false,
  useDeepResearchMode: false,

  // Message actions
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          timestamp: message.timestamp || new Date().toISOString(),
        },
      ],
    })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const updatedMessages = [...state.messages];
      if (updatedMessages.length === 0) {
        updatedMessages.push({
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        });
      } else {
        const lastIndex = updatedMessages.length - 1;
        const lastMessage = updatedMessages[lastIndex];
        if (lastMessage.role === "assistant") {
          updatedMessages[lastIndex] = {
            ...lastMessage,
            content,
            timestamp: new Date().toISOString(),
          };
        } else {
          updatedMessages.push({
            role: "assistant",
            content,
            timestamp: new Date().toISOString(),
          });
        }
      }
      return { messages: updatedMessages };
    }),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),

  // Thread actions
  setThreads: (threads) => set({ threads }),

  addThread: (threadId, metadata) =>
    set((state) => ({
      threads: { ...state.threads, [threadId]: metadata },
    })),

  updateThread: (threadId, metadata) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadId]: { ...state.threads[threadId], ...metadata },
      },
    })),

  deleteThread: (threadId) =>
    set((state) => {
      const { [threadId]: _, ...remainingThreads } = state.threads;
      const newState: Partial<AppStore> = { threads: remainingThreads };

      // Reset current thread if it's the one being deleted
      if (state.currentThreadId === threadId) {
        newState.messages = [];
        newState.currentThreadId = null;
        newState.isStreaming = false;
      }

      return newState;
    }),

  updateThreadMetadata: (threadId, role, content) => {
    const state = get();
    const thread = state.threads[threadId];

    if (!thread) {
      // Create new thread metadata
      const title =
        content.length > 30 ? content.slice(0, 30) + "..." : content;
      set({
        threads: {
          ...state.threads,
          [threadId]: {
            title,
            created_at: new Date().toISOString(),
            message_count: 1,
            messages: [
              {
                role,
                content,
                timestamp: new Date().toISOString(),
              },
            ],
          },
        },
      });
    } else {
      // Update existing thread
      const updatedThread = {
        ...thread,
        message_count: thread.message_count + 1,
        messages: [
          ...thread.messages,
          {
            role,
            content,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // Set title from first user message
      if (thread.message_count === 0 && role === "user") {
        updatedThread.title =
          content.length > 30 ? content.slice(0, 30) + "..." : content;
      }

      set({
        threads: {
          ...state.threads,
          [threadId]: updatedThread,
        },
      });
    }
  },

  setServerThreadsLoaded: (loaded) => set({ serverThreadsLoaded: loaded }),

  // Configuration actions
  setApiUrl: (url) => set({ apiUrl: url }),
  setAssistantId: (id) => set({ assistantId: id }),
  setApiKey: (key) => set({ apiKey: key }),
  setDeepResearchParams: (params) => set({ deepResearchParams: params }),
  setUseQuickMode: (useQuickMode) => set({ useQuickMode, useDeepResearchMode: useQuickMode ? false : get().useDeepResearchMode }),
  setUseDeepResearchMode: (useDeepResearchMode) => set({ useDeepResearchMode, useQuickMode: useDeepResearchMode ? false : get().useQuickMode }),

  getActiveParams: () => {
    const state = get();
    return state.useQuickMode ? quickModeParams : state.deepResearchParams;
  },

  // Reset
  reset: () =>
    set({
      messages: [],
      isStreaming: false,
      currentThreadId: null,
    }),
}));

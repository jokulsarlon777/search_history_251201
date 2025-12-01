// Core types for the Research Agent application

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  tags?: string[];
  duration?: number; // Duration in milliseconds for assistant messages
  sources?: Source[]; // Sources/citations used in the response
}

export interface Thread {
  thread_id: string;
  values?: {
    messages?: any[];
  };
  created_at?: string;
}

export interface ThreadMetadata {
  title: string;
  created_at: string;
  message_count: number;
  messages: Message[];
}

export interface DeepResearchParams {
  max_structured_output_retries?: number;
  allow_clarification?: boolean;
  max_concurrent_research_units?: number;
  max_researcher_iterations?: number;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  currentThreadId: string | null;
}

export interface AppConfig {
  apiUrl: string;
  assistantId: string;
  apiKey: string | null;
}

import { Client } from "@langchain/langgraph-sdk";
import type { Message, Thread, DeepResearchParams } from "./types";

// Environment variables with defaults
const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://127.0.0.1:2024";
const LANGGRAPH_ASSISTANT_ID =
  process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || "Deep Researcher";

/**
 * Creates a LangGraph SDK client instance
 */
export function createLangGraphClient(apiUrl: string, apiKey?: string | null) {
  return new Client({
    apiUrl,
    apiKey: apiKey || undefined,
  });
}

/**
 * Checks if the LangGraph server is healthy
 */
export async function checkServerHealth(client: Client): Promise<boolean> {
  try {
    const assistants = await client.assistants.search();
    return assistants.length > 0;
  } catch (e) {
    console.error("Server health check failed:", e);
    return false;
  }
}

/**
 * Creates a new thread
 */
export async function createThread(client: Client): Promise<Thread | null> {
  try {
    const thread = await client.threads.create();
    return thread as Thread;
  } catch (e) {
    console.error("Thread creation failed:", e);
    return null;
  }
}

/**
 * Loads messages from an existing thread
 */
export async function loadThreadMessages(
  client: Client,
  threadId: string
): Promise<Message[]> {
  try {
    const state = await client.threads.getState(threadId);

    let messages: any[] = [];
    if (Array.isArray(state)) {
      messages = state;
    } else if (typeof state === "object" && state !== null) {
      messages = (state as any).values?.messages || [];
    }

    const formattedMessages: Message[] = [];
    for (const msg of messages) {
      if (typeof msg === "object" && msg !== null) {
        const role = msg.type || msg.role || "";
        const content = msg.content || "";
        const createdAt =
          (msg.created_at as string | undefined) ||
          (msg.timestamp as string | undefined) ||
          new Date().toISOString();
        const tags = Array.isArray((msg as any).tags)
          ? ((msg as any).tags as string[])
          : undefined;

        if (
          role.toLowerCase().includes("human") ||
          role.toLowerCase().includes("user")
        ) {
          formattedMessages.push({
            role: "user",
            content: String(content),
            timestamp: createdAt,
            tags,
          });
        } else if (
          role.toLowerCase().includes("ai") ||
          role.toLowerCase().includes("assistant")
        ) {
          formattedMessages.push({
            role: "assistant",
            content: String(content),
            timestamp: createdAt,
            tags,
          });
        }
      }
    }

    // Calculate duration for assistant messages based on timestamps
    for (let i = 0; i < formattedMessages.length; i++) {
      const message = formattedMessages[i];

      // Find the previous user message
      if (message.role === "assistant" && message.timestamp && !message.duration) {
        // Look backwards for the most recent user message
        for (let j = i - 1; j >= 0; j--) {
          const prevMessage = formattedMessages[j];
          if (prevMessage.role === "user" && prevMessage.timestamp) {
            try {
              const userTime = new Date(prevMessage.timestamp).getTime();
              const assistantTime = new Date(message.timestamp).getTime();
              const duration = assistantTime - userTime;

              // Only set duration if it's positive and reasonable (less than 10 minutes)
              if (duration > 0 && duration < 600000) {
                message.duration = duration;
              }
            } catch (error) {
              console.error("Error calculating duration:", error);
            }
            break;
          }
        }
      }
    }

    return formattedMessages;
  } catch (e) {
    console.error("Failed to load thread messages:", e);
    return [];
  }
}

/**
 * Gets all threads for an assistant
 */
export async function getServerThreads(
  client: Client,
  assistantId: string
): Promise<Thread[]> {
  try {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        assistantId
      );

    const metadata = isUuid
      ? { assistant_id: assistantId }
      : { graph_id: assistantId };

    const threads = await client.threads.search({
      metadata,
      limit: 100,
    });

    return threads as Thread[];
  } catch (e) {
    console.error("Failed to get server threads:", e);
    return [];
  }
}

/**
 * Streams messages from LangGraph
 */
export async function* streamMessage(
  client: Client,
  threadId: string,
  assistantId: string,
  message: string,
  existingMessages?: Message[],
  deepResearchParams?: DeepResearchParams,
  abortSignal?: AbortSignal
): AsyncGenerator<any, void, unknown> {
  // Build message history with the new message
  const messageHistory = existingMessages || [];
  const inputMessages = [
    ...messageHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: "user" as const,
      content: message,
    },
  ];

  // Prepare input data (only messages, not config params)
  const inputData: any = {
    messages: inputMessages,
  };

  // Prepare configuration parameters (separate from input)
  const configParams: any = {};

  // Add deep research params to config if provided
  if (deepResearchParams) {
    if (deepResearchParams.max_structured_output_retries !== undefined) {
      configParams.max_structured_output_retries =
        deepResearchParams.max_structured_output_retries;
    }
    if (deepResearchParams.allow_clarification !== undefined) {
      configParams.allow_clarification = deepResearchParams.allow_clarification;
    }
    if (deepResearchParams.max_concurrent_research_units !== undefined) {
      configParams.max_concurrent_research_units =
        deepResearchParams.max_concurrent_research_units;
    }
    if (deepResearchParams.max_researcher_iterations !== undefined) {
      configParams.max_researcher_iterations =
        deepResearchParams.max_researcher_iterations;
    }
  }

  // Debug: Log final input data and config
  console.log("📤 Sending to LangGraph:", {
    threadId,
    assistantId,
    inputData,
    configParams,
  });

  // Stream the response with config parameters in the correct place
  const stream = await client.runs.stream(threadId, assistantId, {
    input: inputData,
    config: {
      configurable: configParams,
    },
    streamMode: ["updates", "values", "messages"],
    signal: abortSignal, // Pass abort signal to cancel backend execution
  });

  for await (const chunk of stream) {
    yield chunk;
  }
}

/**
 * Deletes a thread
 */
export async function deleteThread(
  client: Client,
  threadId: string
): Promise<boolean> {
  try {
    await client.threads.delete(threadId);
    return true;
  } catch (e) {
    console.error("Failed to delete thread:", e);
    return false;
  }
}

export { LANGGRAPH_API_URL, LANGGRAPH_ASSISTANT_ID };

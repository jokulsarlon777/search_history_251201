"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Moon, Sun, Sparkles, Menu, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ThreadSidebar } from "@/components/thread-sidebar";
import { ConfigSettings } from "@/components/config-settings";
import { ErrorBoundary } from "@/components/error-boundary";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { ExportConversation } from "@/components/export-conversation";
import { LogViewer } from "@/components/log-viewer";
import { ServerHealth } from "@/components/server-health";
import type { ResearchStage } from "@/components/research-progress";
import { ResearchStageStepper } from "@/components/research-stage-stepper";
import { IntermediateResultsDisplay } from "@/components/intermediate-results-display";
import { ConversationSearch } from "@/components/conversation-search";
import { useAppStore } from "@/store/app-store";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { reactModeCache } from "@/lib/cache";
import { logger } from "@/lib/logger";
import {
  createLangGraphClient,
  createThread,
  streamMessage,
  loadThreadMessages,
  getServerThreads,
  deleteThread as deleteThreadApi,
  LANGGRAPH_API_URL,
  LANGGRAPH_ASSISTANT_ID,
} from "@/lib/langgraph";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [researchStage, setResearchStage] = useState<ResearchStage | null>(null);
  const [intermediateResults, setIntermediateResults] = useState<Record<string, any>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const { isOnline, wasOffline} = useNetworkStatus();
  const sourcesRef = useRef<Map<string, { title: string; url: string; snippet?: string }>>(new Map());
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const hasScrolledForCurrentMessageRef = useRef(false);

  // 모드별 Thread ID 관리
  const reactThreadIdRef = useRef<string | null>(null);
  const researchThreadIdRef = useRef<string | null>(null);

  // Stage 전환 타이밍 관리
  const lastStageChangeRef = useRef<number>(0);
  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 경과 시간 추적
  const startTimeRef = useRef<number>(0);
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 완료된 단계 추적
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  const {
    messages,
    isStreaming,
    currentThreadId,
    threads,
    serverThreadsLoaded,
    apiUrl,
    assistantId,
    apiKey,
    useDeepResearchMode,
    useQuickMode,
    getActiveParams,
    setMessages,
    addMessage,
    updateLastAssistantMessage,
    setIsStreaming,
    setCurrentThreadId,
    setThreads,
    addThread,
    deleteThread,
    updateThreadMetadata,
    setServerThreadsLoaded,
    setUseQuickMode,
    reset,
  } = useAppStore();

  useEffect(() => setMounted(true), []);

  // Network status notifications
  useEffect(() => {
    if (!mounted) return;

    if (!isOnline) {
      toast.error("네트워크 연결이 끊어졌습니다", {
        description: "인터넷 연결을 확인해주세요",
      });
    } else if (wasOffline) {
      toast.success("네트워크 연결이 복구되었습니다");
    }
  }, [isOnline, wasOffline, mounted]);

  // Reset scroll flag when streaming starts
  useEffect(() => {
    if (!isStreaming) {
      hasScrolledForCurrentMessageRef.current = false;
    }
  }, [isStreaming]);

  // Smart scroll: scroll to message start when SearchResultsTable appears, otherwise scroll to bottom once
  useEffect(() => {
    if (scrollRef.current && (isStreaming || streamingContent)) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const hasSearchResults = streamingContent.includes('```json:search_results');

        if (hasSearchResults && !hasScrolledForCurrentMessageRef.current) {
          // SearchResultsTable detected: scroll to message start to show Thinking/Tool info
          if (lastAssistantMessageRef.current) {
            lastAssistantMessageRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            hasScrolledForCurrentMessageRef.current = true;
          }
        } else if (!hasSearchResults && !hasScrolledForCurrentMessageRef.current) {
          // Regular text: scroll to bottom once
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          hasScrolledForCurrentMessageRef.current = true;
        }
      }
    }
    // If not streaming and we have messages, preserve scroll position when components render
    else if (!isStreaming && messages.length > 0 && lastAssistantMessageRef.current) {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer && lastAssistantMessageRef.current) {
        // Preserve scroll position before layout changes
        const messageTop = lastAssistantMessageRef.current.offsetTop;
        const currentScrollTop = scrollContainer.scrollTop;

        // Use requestAnimationFrame to handle DOM updates from ConclusionCard & SuggestedQuestions
        requestAnimationFrame(() => {
          // Calculate how much the message position changed
          const newMessageTop = lastAssistantMessageRef.current?.offsetTop || messageTop;
          const heightDiff = newMessageTop - messageTop;

          // If message moved down due to new components (ConclusionCard ~100px, SuggestedQuestions ~200px)
          // adjust scroll to maintain visual position
          if (heightDiff > 0) {
            scrollContainer.scrollTop = currentScrollTop + heightDiff;
          } else {
            // Normal case: scroll to message start
            lastAssistantMessageRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      }
    }
  }, [messages, streamingContent, researchStage, isStreaming]);

  // Keyboard shortcut for search (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    // Find all message indices that contain the search query
    const results: number[] = [];
    messages.forEach((message, index) => {
      if (message.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [messages]);

  // Navigate to next search result
  const handleNextResult = useCallback(() => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    }
  }, [searchResults.length]);

  // Navigate to previous search result
  const handlePreviousResult = useCallback(() => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) =>
        prev === 0 ? searchResults.length - 1 : prev - 1
      );
    }
  }, [searchResults.length]);

  // Close search
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(0);
  }, []);

  // Handle message edit
  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    // Remove messages after the edited message
    const updatedMessages = messages.slice(0, messageIndex);

    // Update the messages state
    setMessages(updatedMessages);

    // Resend the edited message
    await handleSendMessage(newContent);
  };

  // Load server threads on mount (Step 1: Load thread list only, messages loaded on click)
  useEffect(() => {
    const loadThreads = async () => {
      if (serverThreadsLoaded) return;

      try {
        const threadsMap: Record<string, any> = {};

        // Define server configurations
        const REACT_AGENT_URL = process.env.NEXT_PUBLIC_REACT_AGENT_URL || "http://127.0.0.1:2025";
        const REACT_ASSISTANT_ID = process.env.NEXT_PUBLIC_REACT_ASSISTANT_ID || "react_agent";
        const RESEARCH_URL = apiUrl || LANGGRAPH_API_URL;
        const RESEARCH_ASSISTANT_ID = assistantId || LANGGRAPH_ASSISTANT_ID;

        const serverConfigs = [
          {
            type: "react" as const,
            url: REACT_AGENT_URL,
            assistantId: REACT_ASSISTANT_ID,
          },
          {
            type: "research" as const,
            url: RESEARCH_URL,
            assistantId: RESEARCH_ASSISTANT_ID,
          },
        ];

        // OPTIMIZED: Load only thread metadata first (fast), messages loaded on demand
        await Promise.all(
          serverConfigs.map(async (config) => {
            try {
              const client = createLangGraphClient(config.url, apiKey);
              const serverThreads = await getServerThreads(client, config.assistantId);

              // Load first message for each thread to generate title (lightweight)
              const threadPromises = serverThreads.map(async (thread) => {
                try {
                  // Load only the state to get first message for title
                  const state = await client.threads.getState(thread.thread_id);
                  let messages: any[] = [];

                  if (Array.isArray(state)) {
                    messages = state;
                  } else if (typeof state === "object" && state !== null) {
                    messages = (state as any).values?.messages || [];
                  }

                  // Extract title from first user message
                  let title = thread.metadata?.title || "새 대화";
                  if (messages.length > 0) {
                    const firstUserMsg = messages.find((m: any) =>
                      m.type?.toLowerCase().includes("human") ||
                      m.type?.toLowerCase().includes("user") ||
                      m.role?.toLowerCase().includes("user")
                    );
                    if (firstUserMsg?.content) {
                      const content = typeof firstUserMsg.content === "string"
                        ? firstUserMsg.content
                        : JSON.stringify(firstUserMsg.content);
                      title = content.slice(0, 30) + (content.length > 30 ? "..." : "");
                    }
                  }

                  return {
                    thread_id: thread.thread_id,
                    metadata: {
                      title,
                      created_at: thread.created_at || new Date().toISOString(),
                      message_count: messages.length,
                      messages: [], // Don't cache messages yet - loaded on click
                      server_type: config.type,
                      api_url: config.url,
                      assistant_id: config.assistantId,
                    },
                  };
                } catch (error) {
                  console.error(`Failed to load title for thread ${thread.thread_id}:`, error);
                  // Return basic metadata even if title loading fails
                  return {
                    thread_id: thread.thread_id,
                    metadata: {
                      title: thread.metadata?.title || "새 대화",
                      created_at: thread.created_at || new Date().toISOString(),
                      message_count: 0,
                      messages: [],
                      server_type: config.type,
                      api_url: config.url,
                      assistant_id: config.assistantId,
                    },
                  };
                }
              });

              const results = await Promise.all(threadPromises);
              results.forEach((result) => {
                if (result) {
                  threadsMap[result.thread_id] = result.metadata;
                }
              });

              console.log(`✅ Loaded ${serverThreads.length} threads from ${config.type} server with titles`);
            } catch (error) {
              console.error(`Failed to load threads from ${config.type} server:`, error);
            }
          })
        );

        setThreads(threadsMap);
        setServerThreadsLoaded(true);
        console.log(`📋 Total threads loaded: ${Object.keys(threadsMap).length}`);
      } catch (error) {
        console.error("Failed to load threads:", error);
      }
    };

    loadThreads();
  }, [serverThreadsLoaded, apiKey, apiUrl, assistantId, setThreads, setServerThreadsLoaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle thread selection
  const handleThreadSelect = useCallback(async (threadId: string) => {
    if (threadId === currentThreadId) return;

    logger.info('THREAD', 'Thread selected', { threadId });

    try {
      const threadMetadata = threads[threadId];

      // Use cached messages if available
      if (threadMetadata?.messages && threadMetadata.messages.length > 0) {
        console.log(`✅ Using cached messages for thread ${threadId}`);
        setMessages(threadMetadata.messages);
        setCurrentThreadId(threadId);
        return;
      }

      // Show loading state
      setIsLoadingThread(true);

      // If no cached messages, load from correct server
      if (threadMetadata?.api_url && threadMetadata?.assistant_id) {
        console.log(`🔄 Loading messages from ${threadMetadata.server_type} server for thread ${threadId}`);
        const client = createLangGraphClient(threadMetadata.api_url, apiKey);
        const msgs = await loadThreadMessages(client, threadId);
        setMessages(msgs);
        setCurrentThreadId(threadId);

        // Update cache and message count
        updateThreadMetadata(threadId, 'assistant', msgs[msgs.length - 1]?.content || '');
        threadMetadata.messages = msgs;
        threadMetadata.message_count = msgs.length;

        // Update title from first user message if not set
        if (threadMetadata.title === "새 대화" && msgs.length > 0) {
          const firstUserMsg = msgs.find(m => m.role === "user");
          if (firstUserMsg) {
            threadMetadata.title = firstUserMsg.content.slice(0, 30) + "...";
          }
        }
      } else {
        // Fallback: try default server
        console.warn(`⚠️ No server info for thread ${threadId}, using default server`);
        const client = createLangGraphClient(apiUrl || LANGGRAPH_API_URL, apiKey);
        const msgs = await loadThreadMessages(client, threadId);
        setMessages(msgs);
        setCurrentThreadId(threadId);

        // Update message count even for fallback
        if (threadMetadata) {
          threadMetadata.messages = msgs;
          threadMetadata.message_count = msgs.length;
        }
      }
    } catch (error) {
      console.error("Failed to load thread:", error);
      toast.error("대화 불러오기 실패");
    } finally {
      setIsLoadingThread(false);
    }
  }, [currentThreadId, threads, setMessages, setCurrentThreadId, apiKey, apiUrl]);

  // Handle thread deletion
  const handleThreadDelete = useCallback(async (threadId: string) => {
    logger.info('THREAD', 'Thread delete requested', { threadId });

    try {
      const client = createLangGraphClient(apiUrl || LANGGRAPH_API_URL, apiKey);
      const success = await deleteThreadApi(client, threadId);

      if (success) {
        logger.info('THREAD', 'Thread deleted successfully', { threadId });
        deleteThread(threadId);
        toast.success("대화가 삭제되었습니다");
      } else {
        logger.warn('THREAD', 'Thread delete failed', { threadId });
        toast.error("대화 삭제 실패");
      }
    } catch (error) {
      logger.error('THREAD', 'Thread delete error', error as Error, { threadId });
      console.error("Failed to delete thread:", error);
      toast.error("대화 삭제 중 오류 발생");
    }
  }, [apiUrl, apiKey, deleteThread]);

  // Handle new thread
  const handleNewThread = useCallback(() => {
    logger.info('THREAD', 'New thread created');
    logger.logInteraction('thread_action', { content: 'new_thread' });
    reset();
    setUseQuickMode(false);
    toast.success("새 대화를 시작합니다");
  }, [reset, setUseQuickMode]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      toast.info("백엔드 작업을 중단하고 있습니다...", {
        description: "진행 중인 리서치가 중단됩니다",
      });
    }
  };

  // Handle feedback
  const handleFeedback = (messageIndex: number) => (rating: number, comment?: string) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant') return;

    // 피드백 로깅
    logger.logFeedback({
      rating,
      comment,
      messageId: `${currentThreadId}-${messageIndex}`,
      threadId: currentThreadId || undefined,
      mode: useQuickMode ? 'quick' : (useDeepResearchMode ? 'deep' : 'react'),
      duration: message.duration,
      answerPreview: message.content.slice(0, 200),
    });

    // 메시지에 피드백 저장
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...message,
      feedback: {
        rating,
        comment,
        timestamp: new Date().toISOString(),
      },
    };
    setMessages(updatedMessages);

    // Thread 메타데이터 업데이트
    if (currentThreadId) {
      updateThreadMetadata(currentThreadId, 'assistant', message.content);
    }

    toast.success("피드백 감사합니다!", {
      description: `${rating}점을 주셨습니다`,
    });
  };

  // Stage 전환 시 최소 표시 시간 보장 (React 모드 전용)
  const setResearchStageWithDelay = (newStage: ResearchStage, minDisplayTime: number = 0) => {
    const now = Date.now();
    const elapsed = now - lastStageChangeRef.current;
    const remaining = Math.max(0, minDisplayTime - elapsed);

    // 이전 타이머 클리어
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
    }

    if (remaining > 0) {
      // 최소 시간이 남아있으면 딜레이 후 전환
      stageTimerRef.current = setTimeout(() => {
        setResearchStage(prev => {
          // 이전 stage를 완료 목록에 추가
          if (prev && prev.stage !== newStage.stage) {
            setCompletedStages(stages =>
              stages.includes(prev.stage) ? stages : [...stages, prev.stage]
            );
          }
          return newStage;
        });
        lastStageChangeRef.current = Date.now();
      }, remaining);
    } else {
      // 즉시 전환
      setResearchStage(prev => {
        // 이전 stage를 완료 목록에 추가
        if (prev && prev.stage !== newStage.stage) {
          setCompletedStages(stages =>
            stages.includes(prev.stage) ? stages : [...stages, prev.stage]
          );
        }
        return newStage;
      });
      lastStageChangeRef.current = now;
    }
  };

  // Extract sources from various data structures
  const extractSourcesFromData = (data: any) => {
    if (!data || typeof data !== "object") return;

    try {
      // Recursively search for source-like data
      const traverse = (obj: any, depth = 0) => {
        if (depth > 5) return; // Prevent infinite recursion

        if (Array.isArray(obj)) {
          obj.forEach(item => traverse(item, depth + 1));
          return;
        }

        if (typeof obj !== "object" || obj === null) return;

        // Look for URL patterns
        if (obj.url && typeof obj.url === "string") {
          const url = obj.url;
          const title = obj.title || obj.name || obj.label || extractDomainFromUrl(url);
          const snippet = obj.snippet || obj.description || obj.summary || undefined;

          sourcesRef.current.set(url, { url, title, snippet });
        }

        // Look for common search result structures
        if (obj.results && Array.isArray(obj.results)) {
          obj.results.forEach((result: any) => {
            if (result.url) {
              const url = result.url;
              const title = result.title || result.name || extractDomainFromUrl(url);
              const snippet = result.snippet || result.description || undefined;
              sourcesRef.current.set(url, { url, title, snippet });
            }
          });
        }

        // Look for tool calls
        if (obj.tool_calls && Array.isArray(obj.tool_calls)) {
          obj.tool_calls.forEach((call: any) => traverse(call.args, depth + 1));
        }

        // Look for messages with tool calls
        if (obj.messages && Array.isArray(obj.messages)) {
          obj.messages.forEach((msg: any) => traverse(msg, depth + 1));
        }

        // Continue traversing
        Object.values(obj).forEach(value => {
          if (typeof value === "object" && value !== null) {
            traverse(value, depth + 1);
          }
        });
      };

      traverse(data);
    } catch (error) {
      console.error("Error extracting sources:", error);
    }
  };

  // Extract domain from URL for fallback title
  const extractDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const handleSendMessage = async (content: string) => {
    const startTime = Date.now();
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Store user question to filter it from responses
    const userQuestion = content.trim();

    // 로그: 사용자 질문
    logger.logInteraction('question', {
      threadId: currentThreadId || undefined,
      content: userQuestion,
      mode: useQuickMode ? 'quick' : (useDeepResearchMode ? 'deep' : 'react'),
    });

    try {
      setIsStreaming(true);

      // Add user message
      addMessage({ role: "user", content });

      // React Agent 모드일 때만 캐시 확인 (둘 다 OFF일 때)
      if (!useDeepResearchMode && !useQuickMode) {
        const cached = reactModeCache.get(content);
        if (cached) {
          logger.info('CACHE', 'Cache hit', {
            query: content.slice(0, 50),
            savedTime: cached.duration,
          });
          console.log("💾 Cache hit! Returning cached response");
          const stats = reactModeCache.getStats();
          console.log(`📊 Cache stats: ${stats.hits} hits, ${stats.misses} misses, ${(stats.hitRate * 100).toFixed(1)}% hit rate`);

          // 캐시된 응답 즉시 표시
          toast.success("캐시된 응답 사용", {
            description: `이전 검색 결과를 재사용합니다 (${(cached.duration || 0 / 1000).toFixed(1)}s 절약)`,
          });

          addMessage({
            role: "assistant",
            content: cached.response,
            duration: 0, // 캐시된 응답은 즉시 반환
            sources: cached.sources,
          });

          setIsStreaming(false);
          return;
        }
        logger.info('CACHE', 'Cache miss', { query: content.slice(0, 50) });
        console.log("🔍 Cache miss - fetching from server");
      }

      // Initialize streaming state
      setStreamingContent("");
      setIntermediateResults({}); // Clear intermediate results for new message
      setCompletedStages([]); // Clear completed stages
      let bufferContent = "";
      sourcesRef.current.clear(); // Clear sources for new message

      // 경과 시간 추적 시작
      startTimeRef.current = Date.now();

      // 경과 시간 업데이트 인터벌 시작 (1초마다)
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
      }
      elapsedTimeIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setResearchStage(prev => prev ? {
          ...prev,
          elapsedTime: elapsed,
        } : null);
      }, 1000);

      setResearchStage({
        stage: "planning",
        message: "리서치 계획을 수립하고 있습니다...",
        elapsedTime: 0,
      });

      // Mode 확인 및 적절한 서버/Assistant 선택
      const REACT_AGENT_URL = process.env.NEXT_PUBLIC_REACT_AGENT_URL || "http://127.0.0.1:2025";
      const REACT_ASSISTANT_ID = process.env.NEXT_PUBLIC_REACT_ASSISTANT_ID || "react_agent";

      // Quick Mode 또는 Deep Research Mode가 true면 Deep Research 백엔드(포트 2024), false면 React Agent (포트 2025)
      const useDeepResearchBackend = useQuickMode || useDeepResearchMode;
      const selectedApiUrl = useDeepResearchBackend ? (apiUrl || LANGGRAPH_API_URL) : REACT_AGENT_URL;
      const selectedAssistantId = useDeepResearchBackend ? (assistantId || LANGGRAPH_ASSISTANT_ID) : REACT_ASSISTANT_ID;

      logger.info('API', 'API request started', {
        mode: useQuickMode ? 'quick' : (useDeepResearchMode ? 'deep' : 'react'),
        apiUrl: selectedApiUrl,
        assistantId: selectedAssistantId,
        threadId: currentThreadId,
      });

      console.log("🎯 Mode Selection:", {
        useDeepResearchMode,
        useQuickMode,
        selectedApiUrl,
        selectedAssistantId,
      });

      // Create thread if needed - 모드별로 분리된 Thread ID 사용
      const client = createLangGraphClient(selectedApiUrl, apiKey);

      // 현재 모드에 맞는 Thread ID 가져오기
      // Quick Mode 또는 Deep Research Mode면 Deep Research Thread, 아니면 React Agent Thread
      let threadId = useDeepResearchBackend ? researchThreadIdRef.current : reactThreadIdRef.current;

      if (!threadId) {
        const thread = await createThread(client);
        if (!thread) {
          toast.error("Failed to create thread");
          setIsStreaming(false);
          return;
        }
        threadId = thread.thread_id;

        // 모드별 Thread ID 저장
        // Quick Mode 또는 Deep Research Mode면 Deep Research Thread, 아니면 React Agent Thread
        if (useDeepResearchBackend) {
          researchThreadIdRef.current = threadId;
        } else {
          reactThreadIdRef.current = threadId;
        }

        setCurrentThreadId(threadId);

        // Initialize thread metadata with server info
        const newThreadMetadata = {
          title: content.slice(0, 30) + "..." || "새 대화",
          created_at: new Date().toISOString(),
          message_count: 0,
          messages: [],
          server_type: useDeepResearchBackend ? ("research" as const) : ("react" as const),
          api_url: selectedApiUrl,
          assistant_id: selectedAssistantId,
        };

        // Add to threads map
        addThread(threadId, newThreadMetadata);
      }

      // Update thread metadata
      updateThreadMetadata(threadId, "user", content);

      // Stream response
      const activeParams = getActiveParams();

      // Debug: Log active parameters
      console.log("🔍 Active Parameters:", activeParams);
      console.log("🔵 Deep Research Mode:", useDeepResearchMode);
      console.log("⚡ Quick Mode:", useQuickMode);
      console.log("📝 Existing messages count:", messages.length);
      console.log("🆔 Thread ID:", threadId);

      const stream = streamMessage(
        client,
        threadId,
        selectedAssistantId,
        content,
        messages,
        useDeepResearchBackend ? activeParams : {}, // Quick Mode 또는 Deep Research Mode일 때 파라미터 전달
        abortControllerRef.current?.signal // Pass abort signal to cancel backend execution
      );

      // Helper function to remove user question from AI response
      const removeUserQuestion = (responseContent: string): string => {
        if (!responseContent) return responseContent;
        if (!userQuestion) return responseContent;

        const trimmedContent = responseContent.trim();

        // Don't filter if content contains process indicators (Thinking, Tool 호출, etc)
        const processIndicators = ['🤔', '🔧', '📊', '### ', 'Thinking', 'Tool'];
        const hasProcessIndicator = processIndicators.some(indicator =>
          trimmedContent.includes(indicator)
        );

        if (hasProcessIndicator) {
          return responseContent; // Keep process messages intact
        }

        // Remove if question appears at the start with common prefixes
        const patterns = [
          `질문: ${userQuestion}`,
          `Q: ${userQuestion}`,
          `사용자 질문: ${userQuestion}`,
        ];

        for (const pattern of patterns) {
          if (trimmedContent.startsWith(pattern)) {
            const cleaned = trimmedContent.slice(pattern.length).trim();
            return cleaned;
          }
        }

        // If the content is EXACTLY the user question (no prefix), remove it
        if (trimmedContent === userQuestion) {
          return ''; // Return empty - ResearchProgress will still show
        }

        return responseContent;
      };

      // Debounced update function
      const scheduleUpdate = (newContent: string) => {
        // Remove user question if it appears at the start
        const cleanedContent = removeUserQuestion(newContent);
        bufferContent = cleanedContent;

        // Clear existing timer
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
        }

        // Schedule new update
        updateTimerRef.current = setTimeout(() => {
          setStreamingContent(bufferContent);
        }, 150); // Update every 150ms
      };

      try {
        for await (const chunk of stream) {
          // Check if aborted
          if (abortControllerRef.current?.signal.aborted) {
            console.log("🛑 Stream aborted by user");
            break;
          }

          // Update research stage based on event metadata
          if (chunk.event === "metadata" || chunk.event === "updates") {
            const metadata = chunk.data;

            // Try to extract stage information and sources from metadata
            if (metadata && typeof metadata === "object") {
              const metadataStr = JSON.stringify(metadata).toLowerCase();

              if (metadataStr.includes("research") || metadataStr.includes("search")) {
                setResearchStage(prev => {
                  if (prev && prev.stage !== "researching") {
                    setCompletedStages(stages =>
                      stages.includes(prev.stage) ? stages : [...stages, prev.stage]
                    );
                  }
                  return {
                    stage: "researching",
                    message: "웹 리서치를 진행하고 있습니다...",
                  };
                });
                // 중간 결과 업데이트
                setIntermediateResults(prev => ({
                  ...prev,
                  currentStep: "문서 검색 중...",
                }));
              } else if (metadataStr.includes("analyz")) {
                setResearchStage(prev => {
                  if (prev && prev.stage !== "analyzing") {
                    setCompletedStages(stages =>
                      stages.includes(prev.stage) ? stages : [...stages, prev.stage]
                    );
                  }
                  return {
                    stage: "analyzing",
                    message: "수집된 정보를 분석하고 있습니다...",
                  };
                });
                setIntermediateResults(prev => ({
                  ...prev,
                  currentStep: "정보 분석 및 검증 중...",
                }));
              } else if (metadataStr.includes("writ") || metadataStr.includes("generat")) {
                setResearchStage(prev => {
                  if (prev && prev.stage !== "writing") {
                    setCompletedStages(stages =>
                      stages.includes(prev.stage) ? stages : [...stages, prev.stage]
                    );
                  }
                  return {
                    stage: "writing",
                    message: "최종 답변을 작성하고 있습니다...",
                  };
                });
                setIntermediateResults(prev => ({
                  ...prev,
                  currentStep: "종합 답변 생성 중...",
                }));
              }

              // Extract intermediate results from metadata
              try {
                // 문서 개수 추출
                if (metadata.documents || metadata.results) {
                  const docs = metadata.documents || metadata.results;
                  if (Array.isArray(docs)) {
                    setIntermediateResults(prev => ({
                      ...prev,
                      documentsFound: docs.length,
                    }));
                  } else if (typeof docs === 'number') {
                    setIntermediateResults(prev => ({
                      ...prev,
                      documentsFound: docs,
                    }));
                  }
                }

                // 키워드 추출
                if (metadata.keywords) {
                  const keywords = Array.isArray(metadata.keywords)
                    ? metadata.keywords
                    : metadata.keywords.split(',').map((k: string) => k.trim());
                  setIntermediateResults(prev => ({
                    ...prev,
                    keywords: keywords.slice(0, 8),
                  }));
                }

                // 관련도 점수 추출
                if (metadata.relevance || metadata.score) {
                  const score = metadata.relevance || metadata.score;
                  const relevanceScore = typeof score === 'number'
                    ? Math.round(score * 100)
                    : parseInt(score);
                  if (!isNaN(relevanceScore)) {
                    setIntermediateResults(prev => ({
                      ...prev,
                      relevanceScore,
                    }));
                  }
                }
              } catch (error) {
                console.error("Failed to extract intermediate results:", error);
              }

              // Extract sources from metadata/updates
              extractSourcesFromData(metadata);
            }
          }

          // Handle different chunk types
          if (chunk.event === "messages/partial") {
            const message = chunk.data?.[0];
            if (message?.content && typeof message.content === "string") {
              setResearchStage(prev => {
                if (prev && prev.stage !== "writing") {
                  setCompletedStages(stages =>
                    stages.includes(prev.stage) ? stages : [...stages, prev.stage]
                  );
                }
                return {
                  stage: "writing",
                  message: "답변을 생성하고 있습니다...",
                };
              });
              scheduleUpdate(message.content);
            }
            // Extract sources from message data
            if (message) {
              extractSourcesFromData(message);
            }
          } else if (chunk.event === "values") {
            const msgs = chunk.data?.messages || [];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg?.content) {
              setResearchStage({
                stage: "writing",
                message: "답변을 생성하고 있습니다...",
              });
              scheduleUpdate(lastMsg.content);
            }
            // Extract sources from all messages in values
            msgs.forEach((msg: any) => extractSourcesFromData(msg));

            // Also check the entire chunk data for sources
            extractSourcesFromData(chunk.data);
          } else if (chunk.event === "updates") {
            // Handle updates event - check if there are messages with content
            const updateData = chunk.data;
            if (updateData && typeof updateData === "object") {
              // Check for agent or tools nodes
              Object.keys(updateData).forEach(key => {
                const nodeData = updateData[key];
                if (nodeData?.messages && Array.isArray(nodeData.messages)) {
                  const lastMsg = nodeData.messages[nodeData.messages.length - 1];
                  if (lastMsg?.content && typeof lastMsg.content === "string") {
                    const content = lastMsg.content;

                    // React Agent 모드에서만 단계별 진행 상황 표시 (기본값, 둘 다 OFF일 때)
                    if (!useDeepResearchMode && !useQuickMode) {
                      if (key === "agent" && content.includes("🤔 Thinking")) {
                        // Thinking 단계: 최소 2초 표시
                        setResearchStageWithDelay({
                          stage: "thinking",
                          message: "AI가 질문을 분석하고 검색 전략을 수립하는 중입니다...",
                        }, 2000);
                      } else if (key === "agent" && lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
                        // Searching 단계: 최소 1.5초 표시
                        setResearchStageWithDelay({
                          stage: "searching",
                          message: "도구를 호출하여 Elasticsearch에서 정보를 검색하고 있습니다...",
                        }, 1500);
                      } else if (key === "tools" && content.includes("🔧 Tool 호출")) {
                        // Searching 단계 지속: 최소 1초 표시
                        setResearchStageWithDelay({
                          stage: "searching",
                          message: "Elasticsearch에서 관련 차량 데이터를 검색하고 있습니다...",
                        }, 1000);
                      } else if (key === "agent" && (content.includes("📊 검색 결과") || content.includes("### 📊"))) {
                        // Writing 단계: 최소 800ms 표시
                        setResearchStageWithDelay({
                          stage: "writing",
                          message: "검색 결과를 바탕으로 답변을 작성하고 있습니다...",
                        }, 800);
                      }
                    } else {
                      // Deep Research 모드는 기존 로직 유지
                      setResearchStage(prev => {
                        // 이전 stage를 완료 목록에 추가
                        if (prev && prev.stage !== "writing") {
                          setCompletedStages(stages =>
                            stages.includes(prev.stage) ? stages : [...stages, prev.stage]
                          );
                        }
                        return {
                          stage: "writing",
                          message: "답변을 생성하고 있습니다...",
                        };
                      });
                    }

                    scheduleUpdate(content);
                  }
                }
              });
            }
          }

          // Log chunk for debugging (remove this after testing)
          if (chunk.event !== "messages/partial") {
            console.log("📦 Chunk event:", chunk.event, "data:", chunk.data);
          }
        }

        // Clear any pending timer
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
        }

        // Final update with buffered content
        if (bufferContent) {
          setStreamingContent(bufferContent);
        }
      } catch (streamError) {
        // If it's not an abort error, re-throw
        if (!abortControllerRef.current?.signal.aborted) {
          throw streamError;
        }
      }

      // Calculate duration and save final message to store
      const duration = Date.now() - startTime;
      if (bufferContent) {
        // Clear streaming state
        setStreamingContent("");
        setIntermediateResults({}); // Clear intermediate results

        // Collect sources
        const sources = Array.from(sourcesRef.current.values());

        // 로그: API 응답 완료
        logger.info('API', 'API request completed', {
          duration,
          mode: useQuickMode ? 'quick' : (useDeepResearchMode ? 'deep' : 'react'),
          responseLength: bufferContent.length,
          sourcesCount: sources.length,
        });

        // 로그: 사용자 상호작용 (답변)
        logger.logInteraction('answer', {
          threadId,
          content: bufferContent,
          mode: useQuickMode ? 'quick' : (useDeepResearchMode ? 'deep' : 'react'),
          duration,
          sources,
        });

        // Add assistant message with duration and sources
        addMessage({
          role: "assistant",
          content: bufferContent,
          duration,
          sources: sources.length > 0 ? sources : undefined
        });
        updateThreadMetadata(threadId, "assistant", bufferContent);

        // React Agent 모드일 때만 응답 캐싱 (기본값, 둘 다 OFF일 때)
        if (!useDeepResearchMode && !useQuickMode) {
          reactModeCache.set(
            content,
            bufferContent,
            sources.length > 0 ? sources : undefined,
            duration
          );
          console.log(`💾 Response cached for query: "${content.slice(0, 50)}..."`);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);

      // 로그: 에러 발생
      if (!abortControllerRef.current?.signal.aborted) {
        logger.error('ERROR', 'API request failed', error as Error, {
          mode: useQuickMode ? 'quick' : (useDeepResearchMode ? 'deep' : 'react'),
          threadId: currentThreadId,
          query: content.slice(0, 50),
        });
      }

      if (!abortControllerRef.current?.signal.aborted) {
        let errorMessage = "메시지 전송 중 오류가 발생했습니다";
        let errorDescription = "잠시 후 다시 시도해주세요";

        if (error instanceof Error) {
          // Network error
          if (!navigator.onLine) {
            errorMessage = "네트워크 연결이 끊어졌습니다";
            errorDescription = "인터넷 연결을 확인해주세요";
          }
          // Timeout error
          else if (error.message.includes("timeout") || error.message.includes("timed out")) {
            errorMessage = "요청 시간이 초과되었습니다";
            errorDescription = "서버 응답이 지연되고 있습니다. 다시 시도해주세요";
          }
          // API error
          else if (error.message.includes("404")) {
            errorMessage = "서버를 찾을 수 없습니다";
            errorDescription = "LangGraph 서버가 실행 중인지 확인해주세요";
          }
          else if (error.message.includes("500") || error.message.includes("503")) {
            errorMessage = "서버 오류가 발생했습니다";
            errorDescription = "서버에 일시적인 문제가 있습니다";
          }
          // Authentication error
          else if (error.message.includes("401") || error.message.includes("403")) {
            errorMessage = "인증 오류가 발생했습니다";
            errorDescription = "API 키를 확인해주세요";
          }
        }

        // Set error stage
        setResearchStage({
          stage: "error",
          message: errorMessage,
          error: errorDescription,
        });

        toast.error(errorMessage, {
          description: errorDescription,
          action: {
            label: "다시 시도",
            onClick: () => handleSendMessage(content),
          },
        });
      }
    } finally {
      // Cleanup
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      if (stageTimerRef.current) {
        clearTimeout(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
      setStreamingContent("");
      setResearchStage(null);
      setIntermediateResults({}); // Clear intermediate results
      setCompletedStages([]); // Clear completed stages
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  if (!mounted) return null;

  return (
    <ErrorBoundary>
      {/* Conversation Search */}
      <ConversationSearch
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        onSearch={handleSearch}
        currentIndex={currentSearchIndex}
        totalResults={searchResults.length}
        onNext={handleNextResult}
        onPrevious={handlePreviousResult}
      />

      {/* Log Viewer */}
      <LogViewer
        open={logViewerOpen}
        onOpenChange={setLogViewerOpen}
      />

      <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 flex-shrink-0">
          <SectionErrorBoundary sectionName="사이드바" compact>
            <ThreadSidebar
              threads={threads}
              currentThreadId={currentThreadId}
              onThreadSelect={handleThreadSelect}
              onThreadDelete={handleThreadDelete}
              onNewThread={handleNewThread}
            />
          </SectionErrorBoundary>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-xl flex-shrink-0 shadow-sm">
          <div className="w-full px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="space-y-1 fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    사인오프 문제점 조회
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                  LLM 기반 챗봇 시스템
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ServerHealth />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLogViewerOpen(true)}
                className="rounded-full"
                title="로그 뷰어"
              >
                <FileText className="h-5 w-5" />
              </Button>
              <ExportConversation
                messages={messages}
                threadTitle={currentThreadId ? threads[currentThreadId]?.title : "새 대화"}
              />
              <ConfigSettings />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {isLoadingThread ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
              <div className="relative">
                <div className="rounded-full bg-primary/10 p-6 animate-pulse">
                  <Sparkles className="h-12 w-12 text-primary animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                대화 불러오는 중...
              </h2>
              <p className="text-muted-foreground max-w-md text-sm">
                잠시만 기다려주세요
              </p>
            </div>
          ) : messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-6 fade-in px-6">
              <div className="rounded-full bg-primary/10 p-6">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  무엇을 도와드릴까요?
                </h2>
                <p className="text-muted-foreground max-w-md">
                  궁금한 것을 물어보세요. AI가 답변해드립니다.
                </p>
              </div>

              {/* 모드 설명 가이드 */}
              <div className="w-full max-w-3xl mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 기본 모드 (React 모드) */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">기본 모드</h3>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                      일반적인 질문에 빠르게 답변합니다.
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• 응답 속도: <span className="font-medium text-gray-900 dark:text-gray-100">빠름 (5~10초)</span></li>
                      <li>• 정보 깊이: <span className="font-medium text-gray-900 dark:text-gray-100">기본</span></li>
                      <li>• 추천: 간단한 질문</li>
                    </ul>
                  </div>

                  {/* Quick Research 모드 */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <span className="text-lg">⚡</span>
                      </div>
                      <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-100">Quick Research</h3>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed mb-2">
                      빠르게 여러 정보를 조사하여 답변합니다.
                    </p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      <li>• 응답 속도: <span className="font-medium text-amber-900 dark:text-amber-100">보통 (약 3분)</span></li>
                      <li>• 정보 깊이: <span className="font-medium text-amber-900 dark:text-amber-100">중간</span></li>
                      <li>• 추천: 비교/조사가 필요한 질문</li>
                    </ul>
                  </div>

                  {/* Deep Research 모드 */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <span className="text-lg">🔍</span>
                      </div>
                      <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Deep Research</h3>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed mb-2">
                      심층적인 조사를 통해 상세하게 답변합니다.
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• 응답 속도: <span className="font-medium text-blue-900 dark:text-blue-100">느림 (약 5분)</span></li>
                      <li>• 정보 깊이: <span className="font-medium text-blue-900 dark:text-blue-100">매우 깊음</span></li>
                      <li>• 추천: 복잡하고 전문적인 질문</li>
                    </ul>
                  </div>
                </div>

                {/* 사용 팁 */}
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    💡 <span className="font-medium text-foreground">팁:</span> 아래 입력창 위의 버튼으로 모드를 선택할 수 있습니다.
                    선택하지 않으면 기본 모드로 작동합니다.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <SectionErrorBoundary sectionName="메시지">
              {messages.map((message, index) => {
                // Find the last assistant message index
                const lastAssistantIndex = messages.map((m, i) => m.role === "assistant" ? i : -1)
                  .filter(i => i !== -1)
                  .pop();
                const isLastAssistant = message.role === "assistant" && index === lastAssistantIndex;

                return (
                  <div key={`${message.role}-${index}`} className="fade-in">
                    <SectionErrorBoundary sectionName={`메시지 #${index + 1}`} compact>
                      <ChatMessage
                        ref={isLastAssistant ? lastAssistantMessageRef : null}
                        message={message}
                        isEditable={message.role === "user" && index === messages.length - 2}
                        onEdit={(newContent) => handleEditMessage(index, newContent)}
                        onSuggestQuestion={handleSendMessage}
                        onFeedback={message.role === "assistant" ? handleFeedback(index) : undefined}
                      />
                    </SectionErrorBoundary>
                  </div>
                );
              })}
              {(isStreaming || streamingContent) && (
                <SectionErrorBoundary sectionName="스트리밍 메시지" compact>
                  <div className="fade-in space-y-4">
                    {/* Stage Stepper - shows overall progress for Quick/Deep modes */}
                    {(useQuickMode || useDeepResearchMode) && researchStage && (
                      <ResearchStageStepper
                        stages={[
                          { id: 'planning', label: '계획 수립' },
                          { id: 'thinking', label: 'AI 사고' },
                          { id: 'searching', label: '검색' },
                          { id: 'researching', label: '리서치' },
                          { id: 'analyzing', label: '분석' },
                          { id: 'writing', label: '작성' },
                        ]}
                        currentStage={researchStage.stage}
                        completedStages={completedStages}
                      />
                    )}

                    {/* Intermediate Results - shows real-time findings */}
                    {Object.keys(intermediateResults).length > 0 && (
                      <IntermediateResultsDisplay results={intermediateResults} />
                    )}

                    <ChatMessage
                      message={{
                        role: "assistant",
                        content: streamingContent
                      }}
                      researchStage={researchStage}
                      isStreaming={true}
                      onSuggestQuestion={handleSendMessage}
                    />
                  </div>
                </SectionErrorBoundary>
              )}
            </SectionErrorBoundary>
          )}
        </div>
      </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-background/80 backdrop-blur-xl flex-shrink-0 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <ChatInput onSend={handleSendMessage} onStop={handleStopGeneration} disabled={isStreaming} />
            <p className="text-xs text-muted-foreground text-center mt-3">
              Shift + Enter로 줄바꿈, Enter로 전송
            </p>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}

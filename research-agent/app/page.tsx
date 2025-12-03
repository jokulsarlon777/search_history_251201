"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Sparkles, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ThreadSidebar } from "@/components/thread-sidebar";
import { ConfigSettings } from "@/components/config-settings";
import { ErrorBoundary } from "@/components/error-boundary";
import { ExportConversation } from "@/components/export-conversation";
import type { ResearchStage } from "@/components/research-progress";
import { ConversationSearch } from "@/components/conversation-search";
import { useAppStore } from "@/store/app-store";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { reactModeCache } from "@/lib/cache";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const { isOnline, wasOffline} = useNetworkStatus();
  const sourcesRef = useRef<Map<string, { title: string; url: string; snippet?: string }>>(new Map());

  // 모드별 Thread ID 관리
  const reactThreadIdRef = useRef<string | null>(null);
  const researchThreadIdRef = useRef<string | null>(null);

  // Stage 전환 타이밍 관리
  const lastStageChangeRef = useRef<number>(0);
  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-scroll to bottom when messages or streaming content changes
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, streamingContent, researchStage]);

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
  const handleSearch = (query: string) => {
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
  };

  // Navigate to next search result
  const handleNextResult = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    }
  };

  // Navigate to previous search result
  const handlePreviousResult = () => {
    if (searchResults.length > 0) {
      setCurrentSearchIndex((prev) =>
        prev === 0 ? searchResults.length - 1 : prev - 1
      );
    }
  };

  // Close search
  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  // Handle message edit
  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    // Remove messages after the edited message
    const updatedMessages = messages.slice(0, messageIndex);

    // Update the messages state
    setMessages(updatedMessages);

    // Resend the edited message
    await handleSendMessage(newContent);
  };

  // Load server threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      if (serverThreadsLoaded) return;

      try {
        const client = createLangGraphClient(apiUrl || LANGGRAPH_API_URL, apiKey);
        const serverThreads = await getServerThreads(
          client,
          assistantId || LANGGRAPH_ASSISTANT_ID
        );

        const threadsMap: Record<string, any> = {};
        for (const thread of serverThreads) {
          const msgs = await loadThreadMessages(client, thread.thread_id);
          threadsMap[thread.thread_id] = {
            title: msgs[0]?.content.slice(0, 30) + "..." || "새 대화",
            created_at: thread.created_at || new Date().toISOString(),
            message_count: msgs.length,
            messages: msgs,
          };
        }
        setThreads(threadsMap);
        setServerThreadsLoaded(true);
      } catch (error) {
        console.error("Failed to load threads:", error);
      }
    };

    loadThreads();
  }, [serverThreadsLoaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle thread selection
  const handleThreadSelect = async (threadId: string) => {
    if (threadId === currentThreadId) return;

    try {
      const client = createLangGraphClient(apiUrl || LANGGRAPH_API_URL, apiKey);
      const msgs = await loadThreadMessages(client, threadId);
      setMessages(msgs);
      setCurrentThreadId(threadId);
    } catch (error) {
      console.error("Failed to load thread:", error);
      toast.error("대화 불러오기 실패");
    }
  };

  // Handle thread deletion
  const handleThreadDelete = async (threadId: string) => {
    try {
      const client = createLangGraphClient(apiUrl || LANGGRAPH_API_URL, apiKey);
      const success = await deleteThreadApi(client, threadId);

      if (success) {
        deleteThread(threadId);
        toast.success("대화가 삭제되었습니다");
      } else {
        toast.error("대화 삭제 실패");
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("대화 삭제 중 오류 발생");
    }
  };

  // Handle new thread
  const handleNewThread = () => {
    reset();
    setUseQuickMode(false);
    toast.success("새 대화를 시작합니다");
  };

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
        setResearchStage(newStage);
        lastStageChangeRef.current = Date.now();
      }, remaining);
    } else {
      // 즉시 전환
      setResearchStage(newStage);
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

    try {
      setIsStreaming(true);

      // Add user message
      addMessage({ role: "user", content });

      // React Agent 모드일 때만 캐시 확인 (둘 다 OFF일 때)
      if (!useDeepResearchMode && !useQuickMode) {
        const cached = reactModeCache.get(content);
        if (cached) {
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
        console.log("🔍 Cache miss - fetching from server");
      }

      // Initialize streaming state
      setStreamingContent("");
      setResearchStage({ stage: "planning", message: "리서치 계획을 수립하고 있습니다..." });
      let bufferContent = "";
      sourcesRef.current.clear(); // Clear sources for new message

      // Mode 확인 및 적절한 서버/Assistant 선택
      const REACT_AGENT_URL = process.env.NEXT_PUBLIC_REACT_AGENT_URL || "http://127.0.0.1:2025";
      const REACT_ASSISTANT_ID = process.env.NEXT_PUBLIC_REACT_ASSISTANT_ID || "react_agent";

      // useDeepResearchMode가 true면 Deep Research, false면 React Agent (기본값)
      const selectedApiUrl = useDeepResearchMode ? (apiUrl || LANGGRAPH_API_URL) : REACT_AGENT_URL;
      const selectedAssistantId = useDeepResearchMode ? (assistantId || LANGGRAPH_ASSISTANT_ID) : REACT_ASSISTANT_ID;

      console.log("🎯 Mode Selection:", {
        useDeepResearchMode,
        useQuickMode,
        selectedApiUrl,
        selectedAssistantId,
      });

      // Create thread if needed - 모드별로 분리된 Thread ID 사용
      const client = createLangGraphClient(selectedApiUrl, apiKey);

      // 현재 모드에 맞는 Thread ID 가져오기
      // useDeepResearchMode가 true면 Deep Research Thread, false면 React Agent Thread
      let threadId = useDeepResearchMode ? researchThreadIdRef.current : reactThreadIdRef.current;

      if (!threadId) {
        const thread = await createThread(client);
        if (!thread) {
          toast.error("Failed to create thread");
          setIsStreaming(false);
          return;
        }
        threadId = thread.thread_id;

        // 모드별 Thread ID 저장
        // useDeepResearchMode가 true면 Deep Research Thread, false면 React Agent Thread
        if (useDeepResearchMode) {
          researchThreadIdRef.current = threadId;
        } else {
          reactThreadIdRef.current = threadId;
        }

        setCurrentThreadId(threadId);
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
        useDeepResearchMode ? activeParams : {}, // Deep Research 모드일 때만 파라미터 전달
        abortControllerRef.current?.signal // Pass abort signal to cancel backend execution
      );

      // Debounced update function
      const scheduleUpdate = (newContent: string) => {
        bufferContent = newContent;

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
                setResearchStage({
                  stage: "researching",
                  message: "웹 리서치를 진행하고 있습니다...",
                });
              } else if (metadataStr.includes("analyz")) {
                setResearchStage({
                  stage: "analyzing",
                  message: "수집된 정보를 분석하고 있습니다...",
                });
              } else if (metadataStr.includes("writ") || metadataStr.includes("generat")) {
                setResearchStage({
                  stage: "writing",
                  message: "최종 답변을 작성하고 있습니다...",
                });
              }

              // Extract sources from metadata/updates
              extractSourcesFromData(metadata);
            }
          }

          // Handle different chunk types
          if (chunk.event === "messages/partial") {
            const message = chunk.data?.[0];
            if (message?.content && typeof message.content === "string") {
              setResearchStage({
                stage: "writing",
                message: "답변을 생성하고 있습니다...",
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
                      setResearchStage({
                        stage: "writing",
                        message: "답변을 생성하고 있습니다...",
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

        // Collect sources
        const sources = Array.from(sourcesRef.current.values());

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
      setStreamingContent("");
      setResearchStage(null);
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

      <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 flex-shrink-0">
          <ThreadSidebar
            threads={threads}
            currentThreadId={currentThreadId}
            onThreadSelect={handleThreadSelect}
            onThreadDelete={handleThreadDelete}
            onNewThread={handleNewThread}
          />
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
                    AI Research Agent
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                  LangGraph 기반 심층 리서치 워크스페이스
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
          {messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4 fade-in">
              <div className="rounded-full bg-primary/10 p-6">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                무엇을 도와드릴까요?
              </h2>
              <p className="text-muted-foreground max-w-md">
                궁금한 것을 물어보세요. AI가 깊이 있는 리서치를 통해 답변해드립니다.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className="fade-in">
                  <ChatMessage
                    message={message}
                    isEditable={message.role === "user" && index === messages.length - 2}
                    onEdit={(newContent) => handleEditMessage(index, newContent)}
                  />
                </div>
              ))}
              {streamingContent && (
                <div className="fade-in">
                  <ChatMessage
                    message={{
                      role: "assistant",
                      content: streamingContent
                    }}
                    researchStage={researchStage}
                    isStreaming={true}
                  />
                </div>
              )}
            </>
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

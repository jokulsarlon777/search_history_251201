"use client";

import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { UserRound, Sparkles, Copy, CheckCheck, Clock, PencilLine, X as XIcon, SendHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SourceCitation } from "@/components/source-citation";
import { ResearchProgress, type ResearchStage } from "@/components/research-progress";
import { SearchResultsTable } from "@/components/search-results-table";
import { FeedbackRating } from "@/components/feedback-rating";
import {
  SuggestedQuestions,
  ConclusionCard,
  extractSuggestedQuestions,
  extractConclusion,
  removeSuggestedQuestionsSection,
  removeConclusionSection
} from "@/components/suggested-questions";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

// Extract search results JSON from message content
function extractSearchResults(content: string): any | null {
  const regex = /```json:search_results\n([\s\S]*?)\n```/;
  const match = content.match(regex);
  if (!match || !match[1]) return null;

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    console.error("Failed to parse search results JSON:", error);
    return null;
  }
}

// Remove search results JSON block from content
function removeSearchResultsBlock(content: string): string {
  return content.replace(/```json:search_results\n[\s\S]*?\n```/g, '').trim();
}

interface ChatMessageProps {
  message: Message;
  className?: string;
  onEdit?: (newContent: string) => void;
  isEditable?: boolean;
  researchStage?: ResearchStage | null;
  isStreaming?: boolean;
  onSuggestQuestion?: (question: string) => void;
  onFeedback?: (rating: number, comment?: string) => void;
}

function CodeBlock({ inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden">
      <SyntaxHighlighter
        language={language || "text"}
        style={theme === "dark" ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: "1.25rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
        showLineNumbers={language !== ""}
        wrapLines={true}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background border border-border shadow-sm"
        title="코드 복사"
      >
        {copied ? (
          <CheckCheck className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({
  message,
  className,
  onEdit,
  isEditable = false,
  researchStage = null,
  isStreaming = false,
  onSuggestQuestion,
  onFeedback
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const isUser = message.role === "user";

  // Extract suggested questions, conclusion, and search results from assistant messages
  const suggestedQuestions = !isUser ? extractSuggestedQuestions(message.content) : [];
  const conclusion = !isUser ? extractConclusion(message.content) : null;
  const searchResults = !isUser ? extractSearchResults(message.content) : null;

  // Remove conclusion, suggested questions, and search results sections from main content
  let displayContent = message.content;
  if (!isUser) {
    if (conclusion) {
      displayContent = removeConclusionSection(displayContent);
    }
    if (suggestedQuestions.length > 0) {
      displayContent = removeSuggestedQuestionsSection(displayContent);
    }
    if (searchResults) {
      displayContent = removeSearchResultsBlock(displayContent);
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent !== message.content && onEdit) {
      onEdit(editedContent.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const remainingMs = ms % 1000;
    if (seconds < 60) return `${seconds}.${Math.floor(remainingMs / 100)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <Card
        className={cn(
          "group shadow-md hover:shadow-lg transition-all duration-300",
          isUser
            ? "w-fit min-w-[220px] max-w-[65%] xl:max-w-[55%] bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
            : "w-full bg-card border-border"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                <AvatarFallback
                  className={cn(
                    "text-xs font-medium",
                    isUser
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : "bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 text-white"
                  )}
                >
                  {isUser ? (
                    <UserRound className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
                {isUser ? "You" : "AI"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isUser && message.duration && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{formatDuration(message.duration)}</span>
                </div>
              )}
              {isUser && isEditable && !isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStartEdit}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="메시지 수정"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied ? (
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* ResearchProgress를 AI 메시지 카드 내부에 표시 */}
          {!isUser && isStreaming && researchStage && (
            <div className="mb-4">
              <ResearchProgress researchStage={researchStage} />
            </div>
          )}

          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[100px] resize-y"
                placeholder="메시지 내용..."
                autoFocus
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cmd/Ctrl + Enter로 저장, Esc로 취소</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7"
                  >
                    <XIcon className="h-3.5 w-3.5 mr-1" />
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editedContent.trim() || editedContent === message.content}
                    className="h-7"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    저장 및 재전송
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {displayContent && (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:text-foreground break-words overflow-x-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline decoration-primary/30 hover:decoration-primary transition-colors"
                        />
                      ),
                      p: ({ node, children, ...props }) => {
                        // Check if children contains code blocks to avoid hydration error
                        const hasCodeBlock = node?.children?.some(
                          (child: any) => child.tagName === 'code' && child.properties?.className?.includes('language-')
                        );
                        if (hasCodeBlock) {
                          return <div {...props}>{children}</div>;
                        }
                        return <p {...props}>{children}</p>;
                      },
                      code: CodeBlock,
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                </div>
              )}
              {message.sources && message.sources.length > 0 && (
                <SourceCitation sources={message.sources} />
              )}
              {/* Search Results Table */}
              {!isUser && searchResults && !isStreaming && (
                <SearchResultsTable metadata={searchResults} />
              )}
              {/* Conclusion Card */}
              {!isUser && conclusion && !isStreaming && (
                <div className="mt-4">
                  <ConclusionCard content={conclusion} />
                </div>
              )}
              {/* Suggested Questions */}
              {!isUser && suggestedQuestions.length > 0 && onSuggestQuestion && !isStreaming && (
                <div className="mt-4">
                  <SuggestedQuestions
                    questions={suggestedQuestions}
                    onQuestionClick={onSuggestQuestion}
                  />
                </div>
              )}
              {/* Feedback Rating (Beta) */}
              {!isUser && onFeedback && !isStreaming && message.content && (
                <div className="mt-4">
                  <FeedbackRating
                    onSubmit={onFeedback}
                    existingFeedback={message.feedback}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

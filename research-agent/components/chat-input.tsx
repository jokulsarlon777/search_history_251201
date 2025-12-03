"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { SendHorizontal, Zap, CircleStop, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  placeholder = "무엇이든 물어보세요...",
  className,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { useQuickMode, setUseQuickMode, useDeepResearchMode, setUseDeepResearchMode, isStreaming } = useAppStore();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Mode Toggles */}
      <div className="flex items-center justify-start gap-3">
        {/* Quick Mode Toggle */}
        <Button
          variant={useQuickMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (!useQuickMode) {
              // Quick 모드를 켤 때: Deep Research 모드를 끄고 Quick 모드를 켬
              setUseDeepResearchMode(false);
              setUseQuickMode(true);
            } else {
              // Quick 모드를 끌 때: 그냥 끔
              setUseQuickMode(false);
            }
          }}
          className={cn(
            "gap-2 rounded-full transition-all duration-300",
            useQuickMode
              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <Zap className={cn("h-4 w-4", useQuickMode && "animate-pulse")} />
          <span className="font-medium">
            Quick {useQuickMode ? "ON" : "OFF"}
          </span>
        </Button>

        {/* Deep Research Mode Toggle */}
        <Button
          variant={useDeepResearchMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (!useDeepResearchMode) {
              // Deep Research 모드를 켤 때: Quick 모드를 끄고 Deep Research 모드를 켬
              setUseQuickMode(false);
              setUseDeepResearchMode(true);
            } else {
              // Deep Research 모드를 끌 때: 그냥 끔
              setUseDeepResearchMode(false);
            }
          }}
          className={cn(
            "gap-2 rounded-full transition-all duration-300",
            useDeepResearchMode
              ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/30"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <Search className={cn("h-4 w-4", useDeepResearchMode && "animate-pulse")} />
          <span className="font-medium">
            Deep Research {useDeepResearchMode ? "ON" : "OFF"}
          </span>
        </Button>
      </div>

      {/* Input Area */}
      <div className="relative flex items-end gap-2 rounded-2xl bg-background border-2 border-border p-3.5 shadow-lg transition-all duration-300 hover:border-primary/30 focus-within:border-primary focus-within:shadow-xl backdrop-blur-xl">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "전송 중..." : placeholder}
          disabled={disabled}
          className="min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent pr-14 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          rows={1}
        />
        {isStreaming ? (
          <Button
            onClick={onStop}
            size="icon"
            variant="destructive"
            className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md"
          >
            <CircleStop className="h-4.5 w-4.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            size="icon"
            className="absolute bottom-3 right-3 h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md"
          >
            <SendHorizontal className="h-4.5 w-4.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

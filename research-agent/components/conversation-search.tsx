"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConversationSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  currentIndex: number;
  totalResults: number;
  onNext: () => void;
  onPrevious: () => void;
}

export function ConversationSearch({
  isOpen,
  onClose,
  onSearch,
  currentIndex,
  totalResults,
  onNext,
  onPrevious,
}: ConversationSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Handle search input change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed top-20 right-6 z-50 w-96 shadow-2xl border-2 border-primary/20 animate-in slide-in-from-top-4 fade-in-0">
      <div className="p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="대화 내용 검색..."
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Results Counter and Navigation */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {query && totalResults > 0 ? (
              <span>
                {currentIndex + 1} / {totalResults} 결과
              </span>
            ) : query && totalResults === 0 ? (
              <span>결과 없음</span>
            ) : (
              <span>검색어를 입력하세요</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={totalResults === 0}
              className="h-7 w-7"
              title="이전 (Shift + Enter)"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={totalResults === 0}
              className="h-7 w-7"
              title="다음 (Enter)"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              title="닫기 (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Keyboard Hints */}
        <div className="text-[10px] text-muted-foreground/60 space-y-0.5">
          <div>• Enter: 다음 결과</div>
          <div>• Shift + Enter: 이전 결과</div>
          <div>• Esc: 검색 닫기</div>
        </div>
      </div>
    </Card>
  );
}

// Helper component to highlight search results in text
interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  isActive?: boolean;
}

export function HighlightedText({ text, searchQuery, isActive = false }: HighlightedTextProps) {
  if (!searchQuery.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <mark
              key={index}
              className={cn(
                "rounded px-0.5",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-yellow-200 dark:bg-yellow-900/50 text-foreground"
              )}
            >
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import { MessagesSquare, Trash2, PlusCircle, Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ThreadMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThreadSidebarProps {
  threads: Record<string, ThreadMetadata>;
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onThreadDelete: (threadId: string) => void;
  onNewThread: () => void;
}

export function ThreadSidebar({
  threads,
  currentThreadId,
  onThreadSelect,
  onThreadDelete,
  onNewThread,
}: ThreadSidebarProps) {
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sortedThreads = Object.entries(threads).sort(
    ([, a], [, b]) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedThreads;
    }
    const query = searchQuery.toLowerCase();
    return sortedThreads.filter(([, thread]) =>
      thread.title.toLowerCase().includes(query)
    );
  }, [sortedThreads, searchQuery]);

  const handleDelete = () => {
    if (deleteThreadId) {
      onThreadDelete(deleteThreadId);
      setDeleteThreadId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-card border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">대화 기록</h2>
            <Button
              size="sm"
              onClick={onNewThread}
              className="h-8 w-8 p-0"
              title="새 대화"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="대화 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 bg-background/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {filteredThreads.length}개의 세션
            {searchQuery && filteredThreads.length !== sortedThreads.length && (
              <span className="text-primary ml-1">
                (전체 {sortedThreads.length}개 중)
              </span>
            )}
          </p>
        </div>

        {/* Thread List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {sortedThreads.length === 0 ? (
              <div className="p-8 text-center">
                <MessagesSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  아직 대화 기록이 없습니다
                </p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-1">
                  검색 결과가 없습니다
                </p>
                <p className="text-xs text-muted-foreground">
                  다른 키워드로 검색해보세요
                </p>
              </div>
            ) : (
              filteredThreads.map(([threadId, thread]) => (
                <div
                  key={threadId}
                  className={cn(
                    "group relative rounded-lg p-3 mr-10 cursor-pointer transition-all duration-200 max-w-[70%]",
                    currentThreadId === threadId
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                  onClick={() => onThreadSelect(threadId)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessagesSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <h3
                          className={cn(
                            "text-sm font-medium truncate",
                            currentThreadId === threadId
                              ? "text-primary"
                              : "text-foreground"
                          )}
                        >
                          {thread.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(thread.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                        <span>•</span>
                        <span>{thread.message_count}개 메시지</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteThreadId(threadId);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteThreadId !== null}
        onOpenChange={(open) => !open && setDeleteThreadId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>대화 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 대화를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

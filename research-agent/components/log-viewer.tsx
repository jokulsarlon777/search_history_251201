"use client";

import { useState, useEffect } from "react";
import { Download, Search, X, Trash2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logStorage } from "@/lib/log-storage";
import type { LogEntry, LogLevel, LogCategory, LogStats } from "@/lib/log-types";

interface LogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogViewer({ open, onOpenChange }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | "ALL">("ALL");
  const [loading, setLoading] = useState(false);

  // 로그 로드
  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await logStorage.getAll({ limit: 1000 });
      const logStats = await logStorage.getStats();
      setLogs(allLogs);
      setStats(logStats);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  // 필터링
  useEffect(() => {
    let filtered = [...logs];

    // 레벨 필터
    if (levelFilter !== "ALL") {
      filtered = filtered.filter((log) => log.level === levelFilter);
    }

    // 카테고리 필터
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter((log) => log.category === categoryFilter);
    }

    // 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          JSON.stringify(log.data).toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, levelFilter, categoryFilter]);

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Level", "Category", "Message", "Data"];
    const rows = filteredLogs.map((log) => [
      log.timestamp,
      log.level,
      log.category,
      `"${log.message.replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 모든 로그 삭제
  const handleClearAll = async () => {
    if (confirm("모든 로그를 삭제하시겠습니까?")) {
      await logStorage.clear();
      loadLogs();
    }
  };

  // 레벨별 색상
  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "DEBUG":
        return "bg-gray-500";
      case "INFO":
        return "bg-blue-500";
      case "WARN":
        return "bg-yellow-500";
      case "ERROR":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col bg-white dark:bg-zinc-900">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-gray-900 dark:text-gray-100 text-xl">로그 뷰어</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            브라우저에 저장된 로그를 확인하고 분석합니다
          </DialogDescription>
        </DialogHeader>

        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Logs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {stats.byLevel.ERROR}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {stats.byLevel.WARN}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {stats.byLevel.INFO}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Info</div>
            </div>
          </div>
        )}

        {/* 필터 및 액션 */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="로그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | "ALL")}>
            <SelectTrigger className="w-32 bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              <SelectItem value="DEBUG">DEBUG</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as LogCategory | "ALL")}>
            <SelectTrigger className="w-40 bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="USER">USER</SelectItem>
              <SelectItem value="CACHE">CACHE</SelectItem>
              <SelectItem value="STREAM">STREAM</SelectItem>
              <SelectItem value="THREAD">THREAD</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
              <SelectItem value="PERFORMANCE">PERFORMANCE</SelectItem>
              <SelectItem value="INTERACTION">INTERACTION</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={loadLogs}
            disabled={loading}
            className="bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <RefreshCw className={`h-4 w-4 text-gray-700 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleExportJSON}
            className="bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <Download className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleClearAll}
            className="bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <Trash2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </Button>
        </div>

        {/* 로그 목록 */}
        <ScrollArea className="flex-1 border-2 border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-900">
          <div className="p-4 space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8 text-base">
                {loading ? "로그를 불러오는 중..." : "로그가 없습니다"}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-4 bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors space-y-3"
                >
                  {/* 헤더: 레벨, 카테고리, 타임스탬프 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getLevelColor(log.level)} text-white text-xs px-2 py-0.5`}>
                      {log.level}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-zinc-700">
                      {log.category}
                    </Badge>
                    <span className="text-xs text-gray-700 dark:text-gray-300 ml-auto font-semibold">
                      {new Date(log.timestamp).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* 메시지 */}
                  <div className="text-base font-semibold leading-relaxed text-gray-900 dark:text-gray-100">
                    {log.message}
                  </div>

                  {/* 데이터 (있는 경우) */}
                  {log.data && Object.keys(log.data).length > 0 && (
                    <pre className="text-sm bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-4 rounded-md overflow-x-auto font-mono leading-relaxed border-2 border-gray-300 dark:border-zinc-700">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* 푸터 정보 */}
        <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
          <span>
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100"
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100"
            >
              Export CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

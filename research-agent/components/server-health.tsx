"use client";

import { useState, useEffect } from "react";
import { Activity, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ServerHealth {
  name: string;
  url: string;
  status: "online" | "offline" | "error";
  responseTime?: number;
  error?: string;
  version?: string;
  clusterName?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  servers: {
    reactAgent: ServerHealth;
    researchAgent: ServerHealth;
    elasticsearch: ServerHealth;
  };
}

export function ServerHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error("Failed to check server health:", error);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 및 30초마다 자동 체크
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const allOnline = health?.servers.reactAgent.status === "online" &&
                    health?.servers.researchAgent.status === "online" &&
                    health?.servers.elasticsearch.status === "online";

  return (
    <>
      {/* 상태 표시 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2 text-gray-700 dark:text-gray-300"
      >
        <div className={`h-2 w-2 rounded-full ${health ? getStatusColor(health.status) : 'bg-gray-500'} ${loading ? 'animate-pulse' : ''}`} />
        <Activity className="h-4 w-4" />
        <span className="text-xs hidden sm:inline">서버 상태</span>
      </Button>

      {/* 상세 정보 다이얼로그 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              서버 상태
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              백엔드 서버의 연결 상태를 확인합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 전체 상태 */}
            {health && (
              <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">전체 상태</span>
                  <Badge className={`${allOnline ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                    {allOnline ? "정상" : "일부 오류"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  마지막 확인: {new Date(health.timestamp).toLocaleTimeString("ko-KR")}
                </div>
              </div>
            )}

            {/* React Agent 서버 */}
            {health?.servers.reactAgent && (
              <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {getStatusIcon(health.servers.reactAgent.status)}
                      React Agent
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {health.servers.reactAgent.url}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      health.servers.reactAgent.status === "online"
                        ? "border-green-500 text-green-500"
                        : "border-red-500 text-red-500"
                    }`}
                  >
                    {health.servers.reactAgent.status}
                  </Badge>
                </div>
                {health.servers.reactAgent.responseTime && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    응답 시간: {health.servers.reactAgent.responseTime}ms
                  </div>
                )}
                {health.servers.reactAgent.error && (
                  <div className="text-xs text-red-500 mt-1">
                    오류: {health.servers.reactAgent.error}
                  </div>
                )}
              </div>
            )}

            {/* Deep Research Agent 서버 */}
            {health?.servers.researchAgent && (
              <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {getStatusIcon(health.servers.researchAgent.status)}
                      Deep Research Agent
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {health.servers.researchAgent.url}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      health.servers.researchAgent.status === "online"
                        ? "border-green-500 text-green-500"
                        : "border-red-500 text-red-500"
                    }`}
                  >
                    {health.servers.researchAgent.status}
                  </Badge>
                </div>
                {health.servers.researchAgent.responseTime && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    응답 시간: {health.servers.researchAgent.responseTime}ms
                  </div>
                )}
                {health.servers.researchAgent.error && (
                  <div className="text-xs text-red-500 mt-1">
                    오류: {health.servers.researchAgent.error}
                  </div>
                )}
              </div>
            )}

            {/* Elasticsearch 서버 */}
            {health?.servers.elasticsearch && (
              <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {getStatusIcon(health.servers.elasticsearch.status)}
                      Elasticsearch
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {health.servers.elasticsearch.url}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      health.servers.elasticsearch.status === "online"
                        ? "border-green-500 text-green-500"
                        : "border-red-500 text-red-500"
                    }`}
                  >
                    {health.servers.elasticsearch.status}
                  </Badge>
                </div>
                {health.servers.elasticsearch.responseTime && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    응답 시간: {health.servers.elasticsearch.responseTime}ms
                  </div>
                )}
                {health.servers.elasticsearch.version && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    버전: {health.servers.elasticsearch.version}
                  </div>
                )}
                {health.servers.elasticsearch.clusterName && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    클러스터: {health.servers.elasticsearch.clusterName}
                  </div>
                )}
                {health.servers.elasticsearch.error && (
                  <div className="text-xs text-red-500 mt-1">
                    오류: {health.servers.elasticsearch.error}
                  </div>
                )}
              </div>
            )}

            {/* 새로고침 버튼 */}
            <Button
              onClick={checkHealth}
              disabled={loading}
              className="w-full bg-white dark:bg-zinc-800 border-2 border-gray-300 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "확인 중..." : "다시 확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

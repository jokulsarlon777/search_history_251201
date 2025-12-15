"use client";

import { memo } from "react";
import { Loader2, SearchCheck, Lightbulb, Pencil, CheckCircle2, Brain, Database, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ResearchStage {
  stage: "planning" | "thinking" | "searching" | "researching" | "analyzing" | "writing" | "complete" | "error";
  currentSource?: string;
  progress?: number;
  total?: number;
  message?: string;
  error?: string;
  elapsedTime?: number;
}

interface ResearchProgressProps {
  researchStage: ResearchStage | null;
  className?: string;
}

// 시간 포맷 함수
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}분 ${remainingSeconds}초`;
}

const stageConfig = {
  planning: {
    icon: Lightbulb,
    label: "계획 수립",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  thinking: {
    icon: Brain,
    label: "AI가 생각하는 중",
    color: "text-cyan-500",
    bgColor: "bg-gradient-to-r from-cyan-500/10 to-blue-500/10",
  },
  searching: {
    icon: Database,
    label: "데이터 검색 중",
    color: "text-indigo-500",
    bgColor: "bg-gradient-to-r from-indigo-500/10 to-purple-500/10",
  },
  researching: {
    icon: SearchCheck,
    label: "리서치 중",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  analyzing: {
    icon: Loader2,
    label: "분석 중",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  writing: {
    icon: Pencil,
    label: "작성 중",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  complete: {
    icon: CheckCircle2,
    label: "완료",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  error: {
    icon: AlertCircle,
    label: "오류",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

export const ResearchProgress = memo(function ResearchProgress({
  researchStage,
  className,
}: ResearchProgressProps) {
  // Show error stage, but hide complete stage
  if (!researchStage || (researchStage.stage === "complete" && !researchStage.error)) {
    return null;
  }

  const config = stageConfig[researchStage.stage];
  const Icon = config.icon;
  const progressPercentage =
    researchStage.progress && researchStage.total
      ? (researchStage.progress / researchStage.total) * 100
      : undefined;

  // Thinking과 Searching 단계인지 확인
  const isThinkingOrSearching = researchStage.stage === "thinking" || researchStage.stage === "searching";

  return (
    <Card className={cn(
      "border-primary/20 shadow-md animate-in fade-in-0 slide-in-from-top-2",
      isThinkingOrSearching && "border-2 border-primary/30 shadow-lg",
      className
    )}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "rounded-full p-2 flex-shrink-0 relative",
            config.bgColor,
            isThinkingOrSearching && "animate-pulse"
          )}>
            {/* 특별 효과: Thinking/Searching 단계에만 표시 */}
            {isThinkingOrSearching && (
              <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
            )}
            <Icon
              className={cn("h-4 w-4 relative z-10", config.color, {
                "animate-pulse": researchStage.stage === "thinking",
                "animate-spin": researchStage.stage === "analyzing" || researchStage.stage === "searching",
              })}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className={cn("text-sm font-semibold", config.color)}>
                  {config.label}
                </h4>
                {/* Thinking/Searching 단계에 특별 배지 추가 */}
                {isThinkingOrSearching && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full animate-pulse">
                    진행 중
                  </span>
                )}
              </div>
              {progressPercentage !== undefined && (
                <span className="text-xs text-muted-foreground font-medium">
                  {researchStage.progress} / {researchStage.total}
                </span>
              )}
            </div>

            {(researchStage.error || researchStage.message) && (
              <div className="space-y-1.5">
                <p className={cn(
                  "text-xs leading-relaxed",
                  researchStage.error ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground",
                  isThinkingOrSearching && "animate-pulse"
                )}>
                  {researchStage.error || researchStage.message}
                  {isThinkingOrSearching && (
                    <span className="inline-block ml-1 animate-bounce">...</span>
                  )}
                </p>

                {/* 경과 시간 */}
                {!researchStage.error && researchStage.elapsedTime !== undefined && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>경과: {formatElapsedTime(researchStage.elapsedTime)}</span>
                    </div>
                  </div>
                )}

                {/* Thinking/Searching 중일 때 추가 안내 */}
                {isThinkingOrSearching && !researchStage.error && (
                  <p className="text-[10px] text-muted-foreground/60 italic">
                    💡 잠시만 기다려주세요. AI가 정보를 처리하고 있습니다.
                  </p>
                )}
              </div>
            )}

            {researchStage.currentSource && (
              <p className="text-xs text-primary/70 font-mono truncate">
                📄 {researchStage.currentSource}
              </p>
            )}

            {progressPercentage !== undefined && (
              <Progress value={progressPercentage} className="h-1.5" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

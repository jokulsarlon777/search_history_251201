"use client";

import { FileText, Tag, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface IntermediateResult {
  documentsFound?: number;
  keywords?: string[];
  relevanceScore?: number;
  currentStep?: string;
}

interface IntermediateResultsProps {
  results: IntermediateResult;
}

export function IntermediateResults({ results }: IntermediateResultsProps) {
  const { documentsFound, keywords, relevanceScore, currentStep } = results;

  // 아무 데이터도 없으면 표시하지 않음
  if (!documentsFound && !keywords?.length && !relevanceScore && !currentStep) {
    return null;
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 space-y-3">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
        <TrendingUp className="h-4 w-4" />
        <span className="font-semibold text-sm">검색 중인 정보</span>
      </div>

      <div className="space-y-2 text-sm">
        {/* 현재 진행 단계 */}
        {currentStep && (
          <div className="text-gray-700 dark:text-gray-300">
            📍 {currentStep}
          </div>
        )}

        {/* 문서 발견 개수 */}
        {documentsFound !== undefined && documentsFound > 0 && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-900 dark:text-gray-100">
              관련 문서 <strong>{documentsFound}개</strong> 발견
            </span>
          </div>
        )}

        {/* 키워드 */}
        {keywords && keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                핵심 키워드:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 8).map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-white dark:bg-zinc-800 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 관련도 점수 */}
        {relevanceScore !== undefined && relevanceScore > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-gray-900 dark:text-gray-100">
              평균 관련도: <strong>{relevanceScore}%</strong>
            </span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-blue-200 dark:border-blue-800">
        💡 검색이 완료되면 종합 답변을 생성합니다
      </div>
    </Card>
  );
}

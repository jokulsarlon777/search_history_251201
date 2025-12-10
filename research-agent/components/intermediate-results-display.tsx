"use client";

import { memo } from "react";
import { FileText, Tag, TrendingUp, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IntermediateResult {
  documentsFound?: number;
  keywords?: string[];
  relevanceScore?: number;
  currentStep?: string;
  currentSource?: string;
}

interface IntermediateResultsDisplayProps {
  results: IntermediateResult;
  className?: string;
}

export const IntermediateResultsDisplay = memo(function IntermediateResultsDisplay({
  results,
  className,
}: IntermediateResultsDisplayProps) {
  const hasResults = Object.keys(results).length > 0;

  if (!hasResults) {
    return null;
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5 animate-in fade-in-0 slide-in-from-top-2", className)}>
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          {/* Current Step */}
          {results.currentStep && (
            <div className="text-sm text-muted-foreground animate-pulse">
              {results.currentStep}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Documents Found */}
            {results.documentsFound !== undefined && (
              <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">발견된 문서</div>
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {results.documentsFound}개
                  </div>
                </div>
              </div>
            )}

            {/* Relevance Score */}
            {results.relevanceScore !== undefined && (
              <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">관련도</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {results.relevanceScore}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Source */}
          {results.currentSource && (
            <div className="flex items-start gap-2 p-2 bg-background/50 rounded-lg">
              <Globe className="h-4 w-4 text-purple-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">현재 검색 중</div>
                <div className="text-xs font-mono text-purple-600 dark:text-purple-400 truncate">
                  {results.currentSource}
                </div>
              </div>
            </div>
          )}

          {/* Keywords */}
          {results.keywords && results.keywords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span>추출된 키워드</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {results.keywords.map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs px-2 py-0.5 border-primary/30 bg-primary/5 text-primary animate-in fade-in-0"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    #{keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

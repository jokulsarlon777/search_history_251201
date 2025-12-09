"use client";

import { useState, memo } from "react";
import { Database, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchResultData {
  rank: number;
  score: number;
  index: string;
  id: string;
  source: Record<string, any>;
  format_type: string;
}

interface SearchMetadata {
  total_hits: number;
  returned_hits: number;
  index: string;
  query: string;
  results: SearchResultData[];
}

interface SearchResultsTableProps {
  metadata: SearchMetadata;
  className?: string;
}

export const SearchResultsTable = memo(function SearchResultsTable({
  metadata,
  className,
}: SearchResultsTableProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const itemsPerPage = 10;

  const totalPages = Math.ceil(metadata.results.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = metadata.results.slice(startIndex, endIndex);

  const toggleRowExpand = (rank: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rank)) {
      newExpanded.delete(rank);
    } else {
      newExpanded.add(rank);
    }
    setExpandedRows(newExpanded);
  };

  const getDisplayValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string" && value.length > 100) {
      return value.substring(0, 100) + "...";
    }
    return String(value);
  };

  const getMainFields = (source: Record<string, any>, formatType: string) => {
    if (formatType === "vehicle") {
      return {
        title: [source.car_model, source.system, source.issue].filter(Boolean).join(" - ") || "N/A",
        preview: source.cause || source.countermeasure || "상세 정보 없음",
      };
    }
    return {
      title: source.title || source.name || "제목 없음",
      preview: source.content || source.description || "내용 없음",
    };
  };

  return (
    <Card className={cn("mt-4 border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              검색 원본 데이터
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {metadata.returned_hits}개
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {isExpanded && (
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <div>쿼리: <span className="font-mono text-foreground/80">{metadata.query}</span></div>
            <div>인덱스: <span className="font-mono text-foreground/80">{metadata.index}</span></div>
            <div>전체 매칭: <span className="font-semibold text-foreground/80">{metadata.total_hits}건</span></div>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {/* Table */}
          <div className="rounded-md border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border/50">
                    <th className="px-3 py-2 text-left font-semibold text-xs w-16">순위</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs w-20">점수</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs w-32">인덱스</th>
                    <th className="px-3 py-2 text-left font-semibold text-xs flex-1">제목 / 내용</th>
                    <th className="px-3 py-2 text-center font-semibold text-xs w-20">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResults.map((result) => {
                    const { title, preview } = getMainFields(result.source, result.format_type);
                    const isRowExpanded = expandedRows.has(result.rank);

                    return (
                      <tr key={result.rank} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 align-top">
                          <Badge variant="secondary" className="text-xs font-mono">
                            #{result.rank}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {result.score.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {result.index}
                          </code>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="space-y-1">
                            <div className="font-medium text-xs line-clamp-2">{title}</div>
                            {!isRowExpanded && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {getDisplayValue(preview)}
                              </div>
                            )}
                            {isRowExpanded && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                                {Object.entries(result.source).map(([key, value]) => (
                                  <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
                                    <span className="font-semibold text-muted-foreground">{key}:</span>
                                    <span className="font-mono text-foreground/80 break-words">
                                      {getDisplayValue(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpand(result.rank)}
                            className="h-7 w-7 p-0"
                            title={isRowExpanded ? "접기" : "펼치기"}
                          >
                            <Eye className={cn("h-3.5 w-3.5", isRowExpanded && "text-primary")} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                {startIndex + 1}-{Math.min(endIndex, metadata.results.length)} / {metadata.results.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="ml-1 text-xs">이전</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2"
                >
                  <span className="mr-1 text-xs">다음</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

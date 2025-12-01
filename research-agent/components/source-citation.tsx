"use client";

import { memo } from "react";
import { ArrowUpRight, FileStack } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/types";

interface SourceCitationProps {
  sources: Source[];
  className?: string;
}

export const SourceCitation = memo(function SourceCitation({
  sources,
  className,
}: SourceCitationProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Card className={cn("mt-3 border-primary/10 bg-muted/30", className)}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <FileStack className="h-3.5 w-3.5" />
          참고 자료 ({sources.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-[10px] font-bold text-muted-foreground/40 mt-0.5 flex-shrink-0">
              [{index + 1}]
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {source.title}
                </span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {source.snippet && (
                <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-0.5">
                  {source.snippet}
                </p>
              )}
              <p className="text-[9px] text-muted-foreground/50 truncate mt-0.5 font-mono">
                {source.url}
              </p>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
});

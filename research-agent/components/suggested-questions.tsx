"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  className?: string;
}

export function SuggestedQuestions({
  questions,
  onQuestionClick,
  className,
}: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <Card className={cn("border-primary/20 bg-primary/5 backdrop-blur-sm", className)}>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Lightbulb className="h-4 w-4" />
          <span>추가로 궁금하실 수 있는 질문</span>
        </div>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200"
              onClick={() => onQuestionClick(question)}
            >
              <span className="text-sm">{question}</span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

interface ConclusionCardProps {
  content: string;
  className?: string;
}

export function ConclusionCard({ content, className }: ConclusionCardProps) {
  if (!content) return null;

  return (
    <Card className={cn("border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 backdrop-blur-sm", className)}>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
          <Sparkles className="h-4 w-4" />
          <span>결론</span>
        </div>
        <div className="text-sm leading-relaxed text-foreground/90">
          {content}
        </div>
      </div>
    </Card>
  );
}

// Helper function to extract suggested questions from markdown content
export function extractSuggestedQuestions(content: string): string[] {
  // Look for the "추가로 궁금하실 수 있는 질문" section
  const regex = /###\s*🔍\s*추가로 궁금하실 수 있는 질문[\s\S]*?\n((?:\d+\.\s*.+\n?)+)/i;
  const match = content.match(regex);

  if (!match || !match[1]) return [];

  // Extract numbered list items
  const listItems = match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^\d+\./.test(line))
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(q => q.length > 0);

  return listItems;
}

// Helper function to extract conclusion section from content
export function extractConclusion(content: string): string | null {
  // Look for the "결론" section
  const regex = /###\s*💡\s*결론\s*\n([\s\S]*?)(?=###|$)/i;
  const match = content.match(regex);

  if (!match || !match[1]) return null;

  return match[1].trim();
}

// Helper function to remove suggested questions section from content
export function removeSuggestedQuestionsSection(content: string): string {
  // Remove the entire "추가로 궁금하실 수 있는 질문" section
  return content.replace(
    /###\s*🔍\s*추가로 궁금하실 수 있는 질문[\s\S]*$/i,
    ''
  ).trim();
}

// Helper function to remove conclusion section from content
export function removeConclusionSection(content: string): string {
  // Remove the entire "결론" section and everything after
  return content.replace(
    /###\s*💡\s*결론[\s\S]*$/i,
    ''
  ).trim();
}

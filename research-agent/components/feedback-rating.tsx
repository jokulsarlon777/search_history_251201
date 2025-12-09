"use client";

import { useState } from "react";
import { Star, MessageSquare, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackRatingProps {
  onSubmit: (rating: number, comment?: string) => void;
  existingFeedback?: {
    rating: number;
    comment?: string;
  };
}

export function FeedbackRating({ onSubmit, existingFeedback }: FeedbackRatingProps) {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingFeedback?.comment || "");
  const [showComment, setShowComment] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!existingFeedback);

  const handleRatingClick = (value: number) => {
    setRating(value);
    if (!showComment) {
      setShowComment(true);
    }
  };

  const handleSubmit = () => {
    if (rating === 0) return;

    onSubmit(rating, comment.trim() || undefined);
    setIsSubmitted(true);

    // 3초 후 체크 아이콘 숨기기
    setTimeout(() => {
      setShowComment(false);
    }, 3000);
  };

  const handleSkipComment = () => {
    if (rating === 0) return;
    onSubmit(rating);
    setIsSubmitted(true);
    setShowComment(false);
  };

  if (isSubmitted && !showComment) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-green-500" />
        <span>피드백 감사합니다!</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={cn(
                "h-4 w-4",
                value <= (existingFeedback?.rating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
          ))}
        </div>
        {existingFeedback?.comment && (
          <span className="text-xs italic">"{existingFeedback.comment.slice(0, 30)}..."</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="space-y-2">
        <p className="text-sm font-medium">이 답변이 도움이 되었나요?</p>

        {/* 별점 */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRatingClick(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
              aria-label={`${value}점`}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  value <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 hover:text-yellow-200"
                )}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-xs text-muted-foreground">
            {rating === 5 && "🌟 최고예요!"}
            {rating === 4 && "👍 좋아요!"}
            {rating === 3 && "😊 괜찮아요"}
            {rating === 2 && "🤔 아쉬워요"}
            {rating === 1 && "😞 별로예요"}
          </p>
        )}
      </div>

      {/* 의견 입력 (선택사항) */}
      {showComment && rating > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">
              의견을 남겨주세요 (선택사항)
            </label>
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="어떤 점이 좋았나요? 또는 개선이 필요한 부분은 무엇인가요?"
            className="min-h-[80px] resize-none"
            maxLength={500}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {comment.length}/500
            </span>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipComment}
              >
                건너뛰기
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                제출
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 별점만 선택한 경우 자동 제출 안내 */}
      {!showComment && rating > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComment(true)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            의견 추가
          </Button>
          <Button
            size="sm"
            onClick={handleSkipComment}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            제출
          </Button>
        </div>
      )}
    </div>
  );
}

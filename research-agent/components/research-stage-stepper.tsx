"use client";

import { memo } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ResearchStageStepperProps {
  stages: Stage[];
  currentStage: string;
  completedStages: string[];
  className?: string;
}

export const ResearchStageStepper = memo(function ResearchStageStepper({
  stages,
  currentStage,
  completedStages,
  className,
}: ResearchStageStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.id);
          const isCurrent = stage.id === currentStage;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage Circle */}
              <div className="flex flex-col items-center gap-1.5 relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isCompleted && "bg-green-500 border-green-500",
                    isCurrent && "bg-primary border-primary animate-pulse",
                    isUpcoming && "bg-muted border-muted-foreground/30"
                  )}
                >
                  {isCompleted && <CheckCircle2 className="h-5 w-5 text-white" />}
                  {isCurrent && <Loader2 className="h-5 w-5 text-white animate-spin" />}
                  {isUpcoming && <Circle className="h-5 w-5 text-muted-foreground/50" />}
                </div>

                {/* Stage Label */}
                <span
                  className={cn(
                    "text-xs font-medium text-center whitespace-nowrap transition-colors",
                    isCompleted && "text-green-600 dark:text-green-400",
                    isCurrent && "text-primary font-semibold",
                    isUpcoming && "text-muted-foreground/60"
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3 transition-all duration-500",
                    isCompleted && "bg-green-500",
                    !isCompleted && "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

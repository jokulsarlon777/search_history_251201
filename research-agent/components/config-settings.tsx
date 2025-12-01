"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/store/app-store";
import type { DeepResearchParams } from "@/lib/types";

export function ConfigSettings() {
  const [open, setOpen] = useState(false);
  const { deepResearchParams, setDeepResearchParams } = useAppStore();

  const [localParams, setLocalParams] = useState<DeepResearchParams>({
    ...deepResearchParams,
  });

  const handleSave = () => {
    setDeepResearchParams(localParams);
    setOpen(false);
  };

  const handleReset = () => {
    const defaults: DeepResearchParams = {
      max_structured_output_retries: 3,
      allow_clarification: true,
      max_concurrent_research_units: 5,
      max_researcher_iterations: 10,
    };
    setLocalParams(defaults);
    setDeepResearchParams(defaults);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white dark:bg-[#0d1117]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Deep Research 설정</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            AI 리서치 에이전트의 동작 파라미터를 설정하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Max Structured Output Retries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-retries" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Max Structured Output Retries
              </Label>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-md">
                {localParams.max_structured_output_retries ?? 3}
              </span>
            </div>
            <Slider
              id="max-retries"
              min={1}
              max={10}
              step={1}
              value={[localParams.max_structured_output_retries ?? 3]}
              onValueChange={([value]) =>
                setLocalParams({
                  ...localParams,
                  max_structured_output_retries: value,
                })
              }
              className="w-full"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              구조화된 출력 생성 시 재시도 최대 횟수
            </p>
          </div>

          {/* Allow Clarification */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border border-gray-300 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex-1 space-y-1">
              <Label htmlFor="allow-clarification" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Allow Clarification
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                AI가 추가 질문을 통해 명확화할 수 있도록 허용
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${localParams.allow_clarification ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                {localParams.allow_clarification ? 'ON' : 'OFF'}
              </span>
              <Switch
                id="allow-clarification"
                checked={localParams.allow_clarification ?? true}
                onCheckedChange={(checked) =>
                  setLocalParams({
                    ...localParams,
                    allow_clarification: checked,
                  })
                }
              />
            </div>
          </div>

          {/* Max Concurrent Research Units */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-units" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Max Concurrent Research Units
              </Label>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-md">
                {localParams.max_concurrent_research_units ?? 5}
              </span>
            </div>
            <Slider
              id="max-units"
              min={1}
              max={10}
              step={1}
              value={[localParams.max_concurrent_research_units ?? 5]}
              onValueChange={([value]) =>
                setLocalParams({
                  ...localParams,
                  max_concurrent_research_units: value,
                })
              }
              className="w-full"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              동시에 실행 가능한 리서치 유닛의 최대 개수
            </p>
          </div>

          {/* Max Researcher Iterations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-iterations" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Max Researcher Iterations
              </Label>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-md">
                {localParams.max_researcher_iterations ?? 10}
              </span>
            </div>
            <Slider
              id="max-iterations"
              min={1}
              max={20}
              step={1}
              value={[localParams.max_researcher_iterations ?? 10]}
              onValueChange={([value]) =>
                setLocalParams({
                  ...localParams,
                  max_researcher_iterations: value,
                })
              }
              className="w-full"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              리서처가 반복할 수 있는 최대 횟수
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-gray-700">
          <Button variant="outline" onClick={handleReset} className="text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            기본값으로 재설정
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
              취소
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">저장</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

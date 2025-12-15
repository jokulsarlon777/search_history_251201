"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  sectionName?: string;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Compact error boundary for individual sections
 * Shows inline error without breaking the entire app
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.sectionName || 'section'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">
                  {this.props.sectionName || '이 섹션'}에서 오류가 발생했습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {this.state.error?.message || "알 수 없는 오류"}
                </p>
              </div>
              <Button
                onClick={this.handleReset}
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      }

      return (
        <Card className="my-4 border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-destructive">
                  {this.props.sectionName || '이 섹션'}에서 오류가 발생했습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  {this.state.error?.message || "알 수 없는 오류가 발생했습니다."}
                </p>
                <Button
                  onClick={this.handleReset}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  다시 시도
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

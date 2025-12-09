/**
 * Logging 시스템 타입 정의
 */

// 로그 레벨
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// 로그 카테고리
export type LogCategory =
  | 'API'           // API 요청/응답
  | 'USER'          // 사용자 액션
  | 'CACHE'         // 캐시 히트/미스
  | 'STREAM'        // 스트리밍 이벤트
  | 'THREAD'        // Thread 관리
  | 'ERROR'         // 에러
  | 'PERFORMANCE'   // 성능 메트릭
  | 'INTERACTION';  // 사용자 상호작용 (Beta 분석용)

// 사용자 상호작용 타입 (Beta 분석용)
export type InteractionType = 'question' | 'answer' | 'mode_change' | 'thread_action' | 'feedback';

// 기본 로그 엔트리
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, any>;

  // 컨텍스트 정보
  userId?: string;
  threadId?: string;
  sessionId?: string;

  // 성능 정보
  duration?: number;

  // 에러 정보
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// 사용자 상호작용 로그 (Beta 분석용)
export interface UserInteractionLog extends LogEntry {
  category: 'INTERACTION';
  interactionType: InteractionType;

  // 질문-답변 데이터
  content?: string;

  // 모드 정보
  mode?: 'react' | 'quick' | 'deep';

  // 답변 메타데이터
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;

  // 만족도 (향후 추가 가능)
  satisfactionRating?: number;
}

// 사용자 피드백 로그 (Beta 분석용)
export interface FeedbackLog extends LogEntry {
  category: 'INTERACTION';
  interactionType: 'feedback';

  // 피드백 대상
  messageId?: string;
  threadId?: string;

  // 별점 (1-5)
  rating: number;

  // 선택적 의견
  comment?: string;

  // 답변 메타데이터 (분석용)
  mode?: 'react' | 'quick' | 'deep';
  duration?: number;

  // 답변 내용 (일부만 저장)
  answerPreview?: string;
}

// 로그 저장소 인터페이스
export interface LogStorage {
  save(entry: LogEntry): Promise<void>;
  getAll(filter?: LogFilter): Promise<LogEntry[]>;
  clear(): Promise<void>;
  getStats(): Promise<LogStats>;
}

// 로그 필터
export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
}

// 로그 통계
export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  oldestLog?: Date;
  newestLog?: Date;
}

// 로거 설정
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableIndexedDB: boolean;
  enableServer: boolean;
  serverEndpoint?: string;
  maxRetries?: number;
}

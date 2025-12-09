/**
 * 구조화된 Logger 클래스
 * - 콘솔 출력 (색상 코딩)
 * - IndexedDB 저장 (로컬)
 * - 서버 파일 저장 (중앙 집중)
 */

import type {
  LogLevel,
  LogCategory,
  LogEntry,
  UserInteractionLog,
  FeedbackLog,
  InteractionType,
  LoggerConfig,
} from './log-types';
import { logStorage } from './log-storage';

// 로그 레벨 우선순위
const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 콘솔 색상 (브라우저 devtools용)
const COLORS: Record<LogLevel, string> = {
  DEBUG: '#6B7280', // gray
  INFO: '#3B82F6',  // blue
  WARN: '#F59E0B',  // yellow
  ERROR: '#EF4444', // red
};

// 카테고리 이모지
const CATEGORY_EMOJI: Record<LogCategory, string> = {
  API: '🌐',
  USER: '👤',
  CACHE: '💾',
  STREAM: '📡',
  THREAD: '💬',
  ERROR: '❌',
  PERFORMANCE: '⚡',
  INTERACTION: '🎯',
};

class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private pendingLogs: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG',
      enableConsole: true,
      enableIndexedDB: true,
      enableServer: true,
      serverEndpoint: '/api/logs',
      maxRetries: 3,
      ...config,
    };

    // 세션 ID 생성 (같은 브라우저 세션 동안 유지)
    this.sessionId = this.generateSessionId();

    console.log('🔧 Logger initialized:', {
      minLevel: this.config.minLevel,
      sessionId: this.sessionId,
      env: process.env.NODE_ENV,
    });
  }

  /**
   * DEBUG 레벨 로그
   */
  debug(category: LogCategory, message: string, data?: Record<string, any>) {
    this.log('DEBUG', category, message, data);
  }

  /**
   * INFO 레벨 로그
   */
  info(category: LogCategory, message: string, data?: Record<string, any>) {
    this.log('INFO', category, message, data);
  }

  /**
   * WARN 레벨 로그
   */
  warn(category: LogCategory, message: string, data?: Record<string, any>) {
    this.log('WARN', category, message, data);
  }

  /**
   * ERROR 레벨 로그
   */
  error(category: LogCategory, message: string, error?: Error | any, data?: Record<string, any>) {
    const logData = { ...data };

    if (error) {
      logData.error = {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code,
      };
    }

    this.log('ERROR', category, message, logData);
  }

  /**
   * 사용자 상호작용 로그 (Beta 분석용)
   */
  async logInteraction(
    type: InteractionType,
    data: {
      threadId?: string;
      content?: string;
      mode?: 'react' | 'quick' | 'deep';
      duration?: number;
      sources?: any[];
      userId?: string;
    }
  ) {
    const entry: UserInteractionLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'INTERACTION',
      message: `User interaction: ${type}`,
      interactionType: type,
      sessionId: this.sessionId,
      ...data,
    };

    await this.persist(entry);
  }

  /**
   * 사용자 피드백 로그 (Beta 분석용)
   */
  async logFeedback(data: {
    rating: number;
    comment?: string;
    messageId?: string;
    threadId?: string;
    mode?: 'react' | 'quick' | 'deep';
    duration?: number;
    answerPreview?: string;
  }) {
    const entry: FeedbackLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'INTERACTION',
      message: `User feedback: ${data.rating} stars`,
      interactionType: 'feedback',
      sessionId: this.sessionId,
      rating: data.rating,
      comment: data.comment,
      messageId: data.messageId,
      threadId: data.threadId,
      mode: data.mode,
      duration: data.duration,
      answerPreview: data.answerPreview,
    };

    await this.persist(entry);

    // 콘솔에 피드백 로그 출력
    this.info('USER', `Feedback submitted: ${data.rating}/5 stars`, {
      hasComment: !!data.comment,
      mode: data.mode,
    });
  }

  /**
   * 핵심 로그 메서드
   */
  private async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>
  ) {
    // 레벨 체크
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      sessionId: this.sessionId,
    };

    // 콘솔 출력
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // 저장
    await this.persist(entry);
  }

  /**
   * 콘솔 출력 (색상 코딩)
   */
  private logToConsole(entry: LogEntry) {
    const emoji = CATEGORY_EMOJI[entry.category];
    const color = COLORS[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString('ko-KR');

    const prefix = `${emoji} [${entry.level}] [${entry.category}]`;
    const style = `color: ${color}; font-weight: bold;`;

    if (entry.data) {
      console.log(
        `%c${prefix}%c ${timestamp} - ${entry.message}`,
        style,
        'color: inherit;',
        entry.data
      );
    } else {
      console.log(
        `%c${prefix}%c ${timestamp} - ${entry.message}`,
        style,
        'color: inherit;'
      );
    }

    // 에러는 stack trace도 출력
    if (entry.level === 'ERROR' && entry.data?.error?.stack) {
      console.error(entry.data.error.stack);
    }
  }

  /**
   * 로그 저장 (IndexedDB + 서버)
   */
  private async persist(entry: LogEntry) {
    // IndexedDB에 저장 (즉시)
    if (this.config.enableIndexedDB) {
      try {
        await logStorage.save(entry);
      } catch (error) {
        console.error('Failed to save log to IndexedDB:', error);
      }
    }

    // 서버에 전송 (배치 처리)
    if (this.config.enableServer && typeof window !== 'undefined') {
      this.pendingLogs.push(entry);
      this.scheduleBatchUpload();
    }
  }

  /**
   * 배치 업로드 스케줄링 (네트워크 부하 최소화)
   */
  private scheduleBatchUpload() {
    // 이미 스케줄되어 있으면 스킵
    if (this.flushTimer) return;

    // 5초마다 또는 50개 로그마다 전송
    const shouldFlushImmediately = this.pendingLogs.length >= 50;

    if (shouldFlushImmediately) {
      this.flushToServer();
    } else {
      this.flushTimer = setTimeout(() => {
        this.flushToServer();
      }, 5000); // 5초 대기
    }
  }

  /**
   * 서버로 로그 전송
   */
  private async flushToServer() {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      const response = await fetch(this.config.serverEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      console.log(`📤 Uploaded ${logsToSend.length} logs to server`);
    } catch (error) {
      console.warn('Failed to upload logs to server:', error);
      // 실패한 로그는 다시 큐에 추가 (최대 재시도 횟수까지)
      // 여기서는 간단하게 무시 (로컬에는 저장되어 있음)
    }
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(): string {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('logger_session_id');
      if (stored) return stored;

      const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('logger_session_id', newId);
      return newId;
    }
    return `session_${Date.now()}`;
  }

  /**
   * 즉시 서버로 전송 (강제)
   */
  async flush() {
    await this.flushToServer();
  }
}

// 싱글톤 인스턴스
let loggerInstance: Logger | null = null;

export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

// 기본 export
export const logger = getLogger();

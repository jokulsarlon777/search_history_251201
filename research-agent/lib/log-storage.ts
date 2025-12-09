/**
 * IndexedDB 기반 로그 저장소
 * 브라우저 내장 DB로 별도 설치 불필요
 */

import type { LogEntry, LogFilter, LogStats, LogStorage } from './log-types';

const DB_NAME = 'ResearchAgentLogs';
const DB_VERSION = 1;
const STORE_NAME = 'logs';
const MAX_LOGS = 10000; // 최대 로그 개수
const MAX_AGE_DAYS = 7; // 최대 보관 기간

class IndexedDBLogStorage implements LogStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 브라우저 환경에서만 초기화
    if (typeof window !== 'undefined') {
      this.initPromise = this.init();
    }
  }

  /**
   * IndexedDB 초기화
   */
  private async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('📦 IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // logs 스토어 생성
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // 인덱스 생성 (빠른 검색을 위해)
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('level', 'level', { unique: false });
          objectStore.createIndex('category', 'category', { unique: false });
          objectStore.createIndex('threadId', 'threadId', { unique: false });

          console.log('📊 IndexedDB schema created');
        }
      };
    });
  }

  /**
   * 로그 저장
   */
  async save(entry: LogEntry): Promise<void> {
    try {
      await this.initPromise;
      if (!this.db) throw new Error('IndexedDB not initialized');

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save log to IndexedDB:', error);
      // 실패해도 throw하지 않음 (로깅이 메인 기능을 방해하면 안 됨)
    }

    // 주기적으로 오래된 로그 정리
    this.cleanup();
  }

  /**
   * 로그 조회
   */
  async getAll(filter?: LogFilter): Promise<LogEntry[]> {
    try {
      await this.initPromise;
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          let logs = request.result as LogEntry[];

          // 필터 적용
          if (filter) {
            logs = this.applyFilter(logs, filter);
          }

          resolve(logs);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get logs from IndexedDB:', error);
      return [];
    }
  }

  /**
   * 필터 적용
   */
  private applyFilter(logs: LogEntry[], filter: LogFilter): LogEntry[] {
    let filtered = logs;

    // 레벨 필터
    if (filter.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    // 카테고리 필터
    if (filter.category) {
      filtered = filtered.filter((log) => log.category === filter.category);
    }

    // 날짜 범위 필터
    if (filter.startDate) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= filter.startDate!
      );
    }

    if (filter.endDate) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) <= filter.endDate!
      );
    }

    // 검색어 필터
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }

    // 정렬 (최신순)
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 개수 제한
    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * 로그 통계
   */
  async getStats(): Promise<LogStats> {
    const logs = await this.getAll();

    const stats: LogStats = {
      total: logs.length,
      byLevel: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0,
      },
      byCategory: {
        API: 0,
        USER: 0,
        CACHE: 0,
        STREAM: 0,
        THREAD: 0,
        ERROR: 0,
        PERFORMANCE: 0,
        INTERACTION: 0,
      },
    };

    logs.forEach((log) => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
    });

    if (logs.length > 0) {
      const timestamps = logs.map((log) => new Date(log.timestamp).getTime());
      stats.oldestLog = new Date(Math.min(...timestamps));
      stats.newestLog = new Date(Math.max(...timestamps));
    }

    return stats;
  }

  /**
   * 모든 로그 삭제
   */
  async clear(): Promise<void> {
    try {
      await this.initPromise;
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('🗑️ All logs cleared from IndexedDB');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * 오래된 로그 정리
   */
  private async cleanup(): Promise<void> {
    try {
      const logs = await this.getAll();

      // 개수 제한 초과 시 오래된 로그 삭제
      if (logs.length > MAX_LOGS) {
        const toDelete = logs.length - MAX_LOGS;
        const sortedLogs = logs.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        await this.initPromise;
        if (!this.db) return;

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        for (let i = 0; i < toDelete; i++) {
          const log = sortedLogs[i] as any;
          if (log.id) {
            store.delete(log.id);
          }
        }

        console.log(`🗑️ Cleaned up ${toDelete} old logs`);
      }

      // 날짜 기준 정리
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);

      const oldLogs = logs.filter(
        (log) => new Date(log.timestamp) < cutoffDate
      );

      if (oldLogs.length > 0) {
        await this.initPromise;
        if (!this.db) return;

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        oldLogs.forEach((log: any) => {
          if (log.id) {
            store.delete(log.id);
          }
        });

        console.log(`🗑️ Cleaned up ${oldLogs.length} logs older than ${MAX_AGE_DAYS} days`);
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }
}

// 싱글톤 인스턴스
let logStorageInstance: LogStorage | null = null;

export function getLogStorage(): LogStorage {
  if (!logStorageInstance) {
    logStorageInstance = new IndexedDBLogStorage();
  }
  return logStorageInstance;
}

export const logStorage = getLogStorage();

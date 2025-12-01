/**
 * React 모드 응답 캐싱 유틸리티
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  duration?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalQueries: number;
  hitRate: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private stats: CacheStats;
  private defaultTTL: number; // milliseconds

  constructor(defaultTTL: number = 3600000) { // 1시간 기본값
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      hitRate: 0,
    };
    this.defaultTTL = defaultTTL;
  }

  /**
   * 쿼리를 정규화하여 캐시 키 생성
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * 캐시에서 응답 조회
   */
  get(query: string): CacheEntry | null {
    const key = this.normalizeQuery(query);
    const cached = this.cache.get(key);

    this.stats.totalQueries++;

    if (!cached) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // TTL 확인
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      // 만료된 캐시 삭제
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return cached;
  }

  /**
   * 캐시에 응답 저장
   */
  set(
    query: string,
    response: string,
    sources?: Array<{ title: string; url: string; snippet?: string }>,
    duration?: number,
    ttl?: number
  ): void {
    const key = this.normalizeQuery(query);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      sources,
      duration,
    });
  }

  /**
   * 특정 쿼리의 캐시 삭제
   */
  delete(query: string): boolean {
    const key = this.normalizeQuery(query);
    return this.cache.delete(key);
  }

  /**
   * 모든 캐시 삭제
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      hitRate: 0,
    };
  }

  /**
   * 만료된 캐시 항목 정리
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 히트율 업데이트
   */
  private updateHitRate(): void {
    if (this.stats.totalQueries > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalQueries;
    }
  }
}

// 싱글톤 인스턴스 생성
export const reactModeCache = new ResponseCache(3600000); // 1시간 TTL

// 주기적으로 만료된 캐시 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const cleaned = reactModeCache.cleanup();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }, 300000); // 5분
}

// 개발 모드에서 캐시 통계 출력
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__reactModeCache = reactModeCache;
  console.log('💾 React Mode Cache initialized. Access via window.__reactModeCache');
}

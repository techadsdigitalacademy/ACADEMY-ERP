/**
 * High-Performance In-Memory Data Cache & Request Deduplicator
 * 
 * Features:
 * - TTL-based caching with Stale-While-Revalidate support
 * - In-flight Promise deduplication (prevents multiple identical simultaneous network calls)
 * - Wildcard cache invalidation for reactive updates
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Get cached data even if expired (for Stale-While-Revalidate)
   */
  getStale<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > entry.ttl;
    return { data: entry.data as T, isStale };
  }

  /**
   * Set cache entry with TTL (default: 60,000ms = 1 minute)
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Fetch with automatic caching & in-flight deduplication
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttlMs?: number; forceRefresh?: boolean } = {}
  ): Promise<T> {
    const { ttlMs = 60000, forceRefresh = false } = options;

    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if identical request is already in-flight to prevent duplicate network calls
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, ttlMs);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Invalidate specific key or keys matching pattern (e.g. 'finance_*')
   */
  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    if (keyPattern.includes('*')) {
      const regex = new RegExp('^' + keyPattern.replace(/\*/g, '.*') + '$');
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.delete(keyPattern);
    }
  }
}

export const dataCache = new DataCache();

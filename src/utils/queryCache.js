/**
 * Query Result Cache
 * 
 * In-memory cache for frequently accessed database queries.
 * Reduces database load and improves response times.
 * 
 * Features:
 * - TTL (time-to-live) support
 * - Automatic expiration
 * - Cache statistics
 * - Selective invalidation
 */

class QueryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Default TTLs for different query types (in milliseconds)
    this.ttls = {
      user: 60000,           // 1 minute for user data
      character: 30000,      // 30 seconds for character data
      settings: 300000,      // 5 minutes for settings
      list: 10000,           // 10 seconds for lists
      default: 60000         // 1 minute default
    };
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate cache key
   */
  generateKey(prefix, ...args) {
    return `${prefix}:${args.join(':')}`;
  }

  /**
   * Set a value in cache
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.ttls.default);
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    this.stats.sets++;
  }

  /**
   * Get a value from cache
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  /**
   * Delete a specific key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Delete all keys matching a prefix
   */
  deletePrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.deletes += count;
    return count;
  }

  /**
   * Clear entire cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    console.log(`[QUERY CACHE] Cleared ${size} entries`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Run every minute
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[QUERY CACHE] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Get TTL for a specific cache type
   */
  getTTL(type) {
    return this.ttls[type] || this.ttls.default;
  }

  /**
   * Set custom TTL for a cache type
   */
  setTTL(type, milliseconds) {
    this.ttls[type] = milliseconds;
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR COMMON QUERIES
  // ============================================================================

  /**
   * Cache user characters
   */
  cacheUserCharacters(userId, characters) {
    const key = this.generateKey('user_chars', userId);
    this.set(key, characters, this.ttls.user);
  }

  /**
   * Get cached user characters
   */
  getUserCharacters(userId) {
    const key = this.generateKey('user_chars', userId);
    return this.get(key);
  }

  /**
   * Invalidate user cache (after edit/delete)
   */
  invalidateUser(userId) {
    return this.deletePrefix(`user_chars:${userId}`);
  }

  /**
   * Cache character by ID
   */
  cacheCharacter(characterId, character) {
    const key = this.generateKey('char', characterId);
    this.set(key, character, this.ttls.character);
  }

  /**
   * Get cached character
   */
  getCharacter(characterId) {
    const key = this.generateKey('char', characterId);
    return this.get(key);
  }

  /**
   * Invalidate character cache
   */
  invalidateCharacter(characterId) {
    return this.delete(this.generateKey('char', characterId));
  }

  /**
   * Cache settings
   */
  cacheSettings(settings) {
    this.set('settings', settings, this.ttls.settings);
  }

  /**
   * Get cached settings
   */
  getSettings() {
    return this.get('settings');
  }

  /**
   * Invalidate settings cache
   */
  invalidateSettings() {
    return this.delete('settings');
  }

  /**
   * Cache character list for a type
   */
  cacheCharacterList(type, characters) {
    const key = this.generateKey('list', type);
    this.set(key, characters, this.ttls.list);
  }

  /**
   * Get cached character list
   */
  getCharacterList(type) {
    const key = this.generateKey('list', type);
    return this.get(key);
  }

  /**
   * Invalidate all lists (after any character change)
   */
  invalidateAllLists() {
    return this.deletePrefix('list:');
  }
}

// Export singleton instance
export default new QueryCache();

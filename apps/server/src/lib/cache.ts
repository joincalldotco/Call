import redisClient from "../config/redis";

export class CacheService {
  private static instance: CacheService;

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error(
        `Cache delete pattern error for pattern ${pattern}:`,
        error
      );
    }
  }

  // User-specific cache methods
  getUserProfileKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  getUserTeamsKey(userId: string): string {
    return `user:teams:${userId}`;
  }

  getUserCallsKey(userId: string): string {
    return `user:calls:${userId}`;
  }

  getUserContactsKey(userId: string): string {
    return `user:contacts:${userId}`;
  }

  getUserNotificationsKey(userId: string): string {
    return `user:notifications:${userId}`;
  }

  // Team-specific cache methods
  getTeamMembersKey(teamId: string): string {
    return `team:members:${teamId}`;
  }

  // Cache invalidation helpers
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.del(this.getUserProfileKey(userId)),
      this.del(this.getUserTeamsKey(userId)),
      this.del(this.getUserCallsKey(userId)),
      this.del(this.getUserContactsKey(userId)),
      this.del(this.getUserNotificationsKey(userId)),
    ]);
  }

  async invalidateTeamCache(teamId: string, userIds: string[]): Promise<void> {
    const promises = [this.del(this.getTeamMembersKey(teamId))];

    // Invalidate team cache for all members
    userIds.forEach((userId) => {
      promises.push(this.del(this.getUserTeamsKey(userId)));
    });

    await Promise.all(promises);
  }
}

export const cache = CacheService.getInstance();

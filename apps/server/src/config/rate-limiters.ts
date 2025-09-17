import { RateLimiterRedis } from "rate-limiter-flexible";
import redisClient from "./redis.ts";

export const waitlistRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 3,
  duration: 120, // 2 minutes
  blockDuration: 60 * 60,
  keyPrefix: "rl:waitlist",
});

// Rate limiters configuration
// Note: Waitlist rate limiting is now handled in-memory on the web app side

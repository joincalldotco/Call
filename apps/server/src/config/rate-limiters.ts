import { RateLimiterRedis } from "rate-limiter-flexible";
import redisClient from "./redis.ts";

export const waitlistRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 3,
  duration: 120, // 2 minutes
  blockDuration: 60 * 60,
  keyPrefix: "rl:waitlist",
});

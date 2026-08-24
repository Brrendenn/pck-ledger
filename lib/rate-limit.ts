// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash credentials are configured
const isRedisConfigured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// 1. Standard API limiter: 60 requests per 10 seconds
export const standardLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "10 s"),
      analytics: true,
      prefix: "ratelimit:standard",
    })
  : null;

// 2. Strict mutation limiter (POST/PATCH/DELETE): 20 requests per 10 seconds
export const mutationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: true,
      prefix: "ratelimit:mutation",
    })
  : null;

// 3. Bulk upload limiter: 5 requests per 1 minute
export const bulkLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "ratelimit:bulk",
    })
  : null;

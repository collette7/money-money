import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

// Create a new ratelimiter that allows 10 requests per 10 seconds per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

// Separate rate limiter for AI endpoints (more restrictive)
const aiRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/ai",
});

// Separate rate limiter for auth endpoints
const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "@upstash/ratelimit/auth",
});

export async function rateLimit(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const pathname = request.nextUrl.pathname;

  // Different rate limits for different endpoints
  let limiter = ratelimit;
  
  if (pathname.includes("/api/ai") || pathname.includes("/api/categorize")) {
    limiter = aiRatelimit;
  } else if (pathname.includes("/auth")) {
    limiter = authRatelimit;
  }

  const { success, limit, reset, remaining } = await limiter.limit(ip);

  return { success, limit, reset, remaining };
}
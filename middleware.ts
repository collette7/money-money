import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const WINDOW_MS = 10_000;
const MAX_REQUESTS = 30;
const ipHits = new Map<string, number[]>();

function inMemoryRateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);

  if (ipHits.size > 10_000) {
    const oldest = [...ipHits.entries()]
      .sort((a, b) => (a[1].at(-1) ?? 0) - (b[1].at(-1) ?? 0))
      .slice(0, 5_000)
      .map(([k]) => k);
    for (const k of oldest) ipHits.delete(k);
  }

  return { success: hits.length <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - hits.length) };
}

export async function middleware(request: NextRequest) {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { rateLimit } = await import("@/lib/rate-limit");
    const { success, limit, remaining, reset } = await rateLimit(request);

    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(reset).toISOString(),
        },
      });
    }
  } else {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, remaining } = inMemoryRateLimit(ip);

    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

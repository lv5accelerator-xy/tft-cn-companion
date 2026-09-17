import { createClient } from "@supabase/supabase-js";

export class AnalysisAccessError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

export function analysisAccessConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function authenticateAnalysis(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) throw new AnalysisAccessError("请先登录后再分析图片。 / Sign in before analyzing images.", 401);
  if (!analysisAccessConfigured()) throw new AnalysisAccessError("图片分析的访问保护尚未配置。 / Image analysis access protection is not configured.", 503);
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) throw new AnalysisAccessError("登录已失效，请重新登录。 / Please sign in again.", 401);
    return data.user.id;
  } catch (error) {
    if (error instanceof AnalysisAccessError) throw error;
    throw new AnalysisAccessError("暂时无法验证登录，请稍后重试。 / Authentication is temporarily unavailable.", 503);
  }
}

// Atomic, shared across serverless instances. Count attempts, including failures, to bound spend.
export const QUOTA_SCRIPT = `
local minute = tonumber(redis.call('GET', KEYS[1]) or '0')
local day = tonumber(redis.call('GET', KEYS[2]) or '0')
local total = tonumber(redis.call('GET', KEYS[3]) or '0')
if minute >= 2 then return {0, math.max(1, redis.call('TTL', KEYS[1]))} end
if day >= 10 then return {0, math.max(1, redis.call('TTL', KEYS[2]))} end
if total >= 100 then return {0, math.max(1, redis.call('TTL', KEYS[3]))} end
for i = 1, 3 do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('EXPIRE', KEYS[i], i == 1 and 60 or 86400) end
end
return {1, 0}`;

export async function consumeAnalysisQuota(userId: string) {
  try {
    const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(["EVAL", QUOTA_SCRIPT, "3", `tft:analysis:${userId}:minute`, `tft:analysis:${userId}:day`, "tft:analysis:global:day"]),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Quota service unavailable");
    const payload = await response.json();
    if (payload.error || !Array.isArray(payload.result) || ![0, 1].includes(payload.result[0]) || !Number.isFinite(payload.result[1])) throw new Error("Invalid quota response");
    if (payload.result[0] === 0) throw new AnalysisAccessError("图片分析次数已达上限，请稍后再试。 / Image analysis limit reached. Try again later.", 429, Math.max(1, payload.result[1]));
  } catch (error) {
    if (error instanceof AnalysisAccessError) throw error;
    throw new AnalysisAccessError("暂时无法检查分析额度，请稍后重试。 / Analysis quota is temporarily unavailable.", 503);
  }
}

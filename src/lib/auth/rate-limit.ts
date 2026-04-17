const requestMap = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
  } = { limit: 20, windowMs: 60_000 },
) {
  const now = Date.now();
  const current = requestMap.get(key);

  if (!current || current.resetAt < now) {
    requestMap.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1 };
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  requestMap.set(key, current);

  return { allowed: true, remaining: options.limit - current.count };
}

const store = new Map<string, number[]>()

const LIMIT = 5
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  const timestamps = (store.get(ip) ?? []).filter(t => t > windowStart)

  if (timestamps.length >= LIMIT) {
    const oldest = timestamps[0]
    const retryAfterSecs = Math.ceil((oldest + WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfterSecs }
  }

  timestamps.push(now)
  store.set(ip, timestamps)
  return { allowed: true, retryAfterSecs: 0 }
}

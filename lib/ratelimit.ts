import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let limiter: Ratelimit | null | undefined

function getLimiter() {
  if (limiter !== undefined) return limiter
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  limiter = url && token
    ? new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'veriphy' })
    : null
  return limiter
}

/** true = autorisé. Sans Upstash configuré → toujours autorisé. */
export async function checkRateLimit(id: string): Promise<boolean> {
  const l = getLimiter()
  if (!l) return true
  const { success } = await l.limit(id)
  return success
}

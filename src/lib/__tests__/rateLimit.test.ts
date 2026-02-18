import { describe, test, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit } from '../rateLimit'

// Each test uses a unique IP to avoid shared state pollution
let ipCounter = 0
function freshIp() {
  return `192.168.1.${++ipCounter}`
}

describe('checkRateLimit', () => {
  test('allows first request', () => {
    const result = checkRateLimit(freshIp())
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    expect(result.retryAfter).toBe(0)
  })

  test('allows requests up to the limit', () => {
    const ip = freshIp()
    checkRateLimit(ip) // 1
    checkRateLimit(ip) // 2
    const third = checkRateLimit(ip) // 3 — limit
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)
  })

  test('blocks request after limit is reached', () => {
    const ip = freshIp()
    checkRateLimit(ip)
    checkRateLimit(ip)
    checkRateLimit(ip)
    const blocked = checkRateLimit(ip) // 4th
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  test('resets after window expires', () => {
    const ip = freshIp()
    checkRateLimit(ip)
    checkRateLimit(ip)
    checkRateLimit(ip)

    // Fast-forward time past the 60s window
    vi.useFakeTimers()
    vi.advanceTimersByTime(61_000)

    const afterReset = checkRateLimit(ip)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(2)

    vi.useRealTimers()
  })

  test('tracks different IPs independently', () => {
    const ip1 = freshIp()
    const ip2 = freshIp()

    checkRateLimit(ip1)
    checkRateLimit(ip1)
    checkRateLimit(ip1)
    checkRateLimit(ip1) // ip1 is blocked

    const ip2Result = checkRateLimit(ip2)
    expect(ip2Result.allowed).toBe(true) // ip2 unaffected
  })
})

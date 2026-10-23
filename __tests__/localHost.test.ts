import { describe, expect, it } from 'vitest'
import { isLoopbackHost } from '@/lib/localHost'

describe('isLoopbackHost', () => {
  it('accepts loopback names on any port', () => {
    expect(isLoopbackHost('localhost:3000')).toBe(true)
    expect(isLoopbackHost('127.0.0.1:9877')).toBe(true)
    expect(isLoopbackHost('[::1]:9877')).toBe(true)
    expect(isLoopbackHost('LOCALHOST')).toBe(true)
  })

  it('rejects other names, including rebound ones and lookalikes', () => {
    expect(isLoopbackHost('evil.example:9877')).toBe(false)
    expect(isLoopbackHost('localhost.evil.example')).toBe(false)
    expect(isLoopbackHost('192.168.1.70:3000')).toBe(false)
    expect(isLoopbackHost('')).toBe(false)
    expect(isLoopbackHost(null)).toBe(false)
    expect(isLoopbackHost('bad host')).toBe(false)
  })
})

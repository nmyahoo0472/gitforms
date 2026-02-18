import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock the GitHub fetch call
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Set required env vars
vi.stubEnv('GITHUB_TOKEN', 'test-token')
vi.stubEnv('GITHUB_REPO', 'testowner/testrepo')

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'en',
      'x-forwarded-for': '10.0.0.' + Math.floor(Math.random() * 200 + 50), // avoid rate limit
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const validBody = {
  firstName: 'Mario',
  lastName: 'Rossi',
  email: 'mario@example.com',
  message: 'This is a test message with enough characters to pass validation.',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
})

describe('POST /api/contact', () => {
  test('returns 400 when required fields are missing', async () => {
    const req = makeRequest({ firstName: 'Mario' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('returns 400 for invalid email', async () => {
    const req = makeRequest({ ...validBody, email: 'not-an-email' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  test('returns 201 on valid submission', async () => {
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  test('silently returns 200 when honeypot is filled', async () => {
    const req = makeRequest({ ...validBody, website: 'http://spam.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    // fetch to GitHub should NOT have been called
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('returns 500 when GitHub API fails', async () => {
    mockFetch.mockResolvedValueOnce(new Response('error', { status: 500 }))
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  test('returns Italian error messages when Accept-Language is it', async () => {
    const req = makeRequest(
      { firstName: '', lastName: '', email: '', message: '' },
      { 'Accept-Language': 'it-IT,it;q=0.9' }
    )
    const res = await POST(req)
    const json = await res.json()
    // Should contain Italian text
    expect(json.error).toContain('obbligatori')
  })

  test('returns 429 after rate limit is exceeded', async () => {
    const ip = '10.0.0.1' // fixed IP for rate limit test
    const makeIpRequest = (b = validBody) =>
      new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify(b),
      })

    // 3 allowed
    await POST(makeIpRequest())
    await POST(makeIpRequest())
    await POST(makeIpRequest())

    // 4th should be blocked
    const res = await POST(makeIpRequest())
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })
})

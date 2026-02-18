import { describe, test, expect } from 'vitest'
import { sanitizeText, sanitizeEmail } from '../sanitize'

describe('sanitizeText', () => {
  test('removes ATX headings', () => {
    expect(sanitizeText('# Title\nHello')).toBe('Title\nHello')
    expect(sanitizeText('## Section\nContent')).toBe('Section\nContent')
  })

  test('removes markdown links but keeps link text', () => {
    expect(sanitizeText('Click [here](https://evil.com) now')).toBe('Click here now')
  })

  test('removes fenced code blocks', () => {
    const input = 'Before\n```\nrm -rf /\n```\nAfter'
    expect(sanitizeText(input)).toBe('Before\n[code removed]\nAfter')
  })

  test('removes inline code', () => {
    expect(sanitizeText('Use `eval(x)` here')).toBe('Use [code removed] here')
  })

  test('removes HTML tags', () => {
    expect(sanitizeText('<script>alert(1)</script>Hello')).toBe('Hello')
  })

  test('enforces maxLength', () => {
    const long = 'a'.repeat(200)
    expect(sanitizeText(long, 100)).toHaveLength(100)
  })

  test('passes through clean text unchanged', () => {
    const clean = 'Hello, I need help with my project.'
    expect(sanitizeText(clean)).toBe(clean)
  })
})

describe('sanitizeEmail', () => {
  test('lowercases input', () => {
    expect(sanitizeEmail('User@EXAMPLE.COM')).toBe('user@example.com')
  })

  test('removes invalid characters', () => {
    expect(sanitizeEmail('user<script>@example.com')).toBe('usercript@example.com')
  })

  test('enforces 254 char max', () => {
    const long = 'a'.repeat(300) + '@example.com'
    expect(sanitizeEmail(long).length).toBeLessThanOrEqual(254)
  })

  test('passes through valid email unchanged', () => {
    expect(sanitizeEmail('mario.rossi+test@esempio.it')).toBe('mario.rossi+test@esempio.it')
  })
})

interface SpamCheckInput {
  firstName: string
  lastName: string
  email: string
  company?: string
  message: string
}

/**
 * Returns a spam score from 0 (clean) to 100 (definite spam).
 *
 * Integration in route.ts:
 *   score >= 50 → add 'suspected-spam' label to GitHub Issue
 *   score >= 80 → silent HTTP 200 reject (bot not informed)
 */
export function calculateSpamScore(input: SpamCheckInput): number {
  let score = 0

  const msg = input.message

  // Too short to be a real message
  if (msg.length < 20) score += 30

  // Spam keyword patterns (common in contact form spam)
  const spamPatterns = [
    /buy\s+crypto/i,
    /casino/i,
    /\bviagra\b/i,
    /\bcialis\b/i,
    /make\s+money/i,
    /\bloan\b/i,
    /click\s+here/i,
    /\bseo\s+service/i,
    /earn\s+\$\d+/i,
    /work\s+from\s+home/i,
    /investment\s+opportunity/i,
    /guaranteed\s+return/i,
    /double\s+your/i,
    /free\s+money/i,
    /winner\s+selected/i,
  ]
  const spamMatches = spamPatterns.filter(p => p.test(msg)).length
  score += Math.min(spamMatches * 15, 45)

  // Multiple URLs in message
  const urlMatches = (msg.match(/https?:\/\/[^\s]+/g) || []).length
  if (urlMatches >= 2) score += 20
  if (urlMatches >= 4) score += 20

  // Numeric-heavy email local part (e.g. abc123456789@domain.com)
  const localPart = input.email.split('@')[0] || ''
  const numericRatio = (localPart.match(/\d/g) || []).length / Math.max(localPart.length, 1)
  if (numericRatio > 0.6) score += 15

  // ALL CAPS message (shouting / bot)
  const letters = msg.replace(/[^a-zA-Z]/g, '')
  if (letters.length > 10) {
    const capsRatio = (letters.match(/[A-Z]/g) || []).length / letters.length
    if (capsRatio > 0.7) score += 20
  }

  return Math.min(score, 100)
}

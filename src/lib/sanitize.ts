/**
 * Strip patterns that could inject markdown into GitHub Issues:
 * - ATX headings (# Title)
 * - Inline/reference links ([text](url))
 * - Fenced code blocks (``` ... ```)
 * - HTML tags
 */
export function sanitizeText(input: string, maxLength = 5000): string {
  return input
    .slice(0, maxLength)
    // Remove ATX headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links [text](url) and [text][ref]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, '[code removed]')
    // Remove inline code
    .replace(/`[^`]+`/g, '[code removed]')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    .trim()
}

/**
 * Strip characters outside the valid email character set
 * and enforce RFC 5321 max length of 254 characters.
 */
export function sanitizeEmail(input: string): string {
  return input
    .slice(0, 254)
    // Keep only valid email charset: alphanumeric + . _ % + - @ characters
    .replace(/[^a-zA-Z0-9._%+\-@]/g, '')
    .toLowerCase()
    .trim()
}

export type LeadIntent = 'sales' | 'support' | 'partnership' | 'other'
export type LeadUrgency = 'high' | 'normal' | 'low'

export interface LeadClassification {
  intent: LeadIntent
  urgency: LeadUrgency
  summary: string
}

const DEFAULT_CLASSIFICATION: LeadClassification = {
  intent: 'other',
  urgency: 'normal',
  summary: '',
}

/**
 * Classify lead intent and urgency using Claude Haiku.
 * Requires ANTHROPIC_API_KEY env var — gracefully degrades if absent.
 * Cost: fractions of a cent per submission (Haiku tier pricing).
 */
export async function classifyLead(
  message: string
): Promise<LeadClassification> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return DEFAULT_CLASSIFICATION

  // Truncate to 500 chars to minimize cost
  const excerpt = message.slice(0, 500)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Classify this contact form message. Reply ONLY with valid JSON, no explanation.

Message: "${excerpt}"

JSON schema:
{
  "intent": "sales" | "support" | "partnership" | "other",
  "urgency": "high" | "normal" | "low",
  "summary": "one sentence max 80 chars"
}`,
          },
        ],
      }),
    })

    if (!response.ok) return DEFAULT_CLASSIFICATION

    const data = await response.json()
    const text = data?.content?.[0]?.text ?? ''

    // Extract JSON even if model adds surrounding text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return DEFAULT_CLASSIFICATION

    const parsed = JSON.parse(match[0]) as Partial<LeadClassification>

    const validIntents: LeadIntent[] = ['sales', 'support', 'partnership', 'other']
    const validUrgencies: LeadUrgency[] = ['high', 'normal', 'low']

    return {
      intent: validIntents.includes(parsed.intent as LeadIntent)
        ? (parsed.intent as LeadIntent)
        : 'other',
      urgency: validUrgencies.includes(parsed.urgency as LeadUrgency)
        ? (parsed.urgency as LeadUrgency)
        : 'normal',
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 80) : '',
    }
  } catch {
    return DEFAULT_CLASSIFICATION
  }
}

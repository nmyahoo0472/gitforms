import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rateLimit'
import { sanitizeText, sanitizeEmail } from '../../../lib/sanitize'
import { calculateSpamScore } from '../../../lib/spamScore'
import { classifyLead } from '../../../lib/classify'
import translations from '../../../../config/translations.json'

type Locale = 'en' | 'it'
type TranslationMessages = typeof translations.en.messages

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function getLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  return acceptLanguage.toLowerCase().includes('it') ? 'it' : 'en'
}

function msg(locale: Locale, key: keyof TranslationMessages, vars?: Record<string, string | number>): string {
  const t = translations[locale]?.messages ?? translations.en.messages
  let text: string = (t as TranslationMessages)[key] ?? (translations.en.messages[key] as string)
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  company?: string
  message: string
  // Honeypot — must be empty for real users
  website?: string
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  const locale = getLocale(request)

  try {
    // ── Rate limiting ──────────────────────────────────────────────────────
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: msg(locale, 'tooManyRequests', { seconds: rateCheck.retryAfter }) },
        {
          status: 429,
          headers: {
            ...corsHeaders(),
            'Retry-After': String(rateCheck.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const body: ContactFormData = await request.json()

    // ── Honeypot check ─────────────────────────────────────────────────────
    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders() })
    }

    // ── Input sanitization ─────────────────────────────────────────────────
    const firstName = sanitizeText(body.firstName ?? '', 100)
    const lastName = sanitizeText(body.lastName ?? '', 100)
    const email = sanitizeEmail(body.email ?? '')
    const company = body.company ? sanitizeText(body.company, 200) : undefined
    const message = sanitizeText(body.message ?? '', 5000)

    // ── Field validation ───────────────────────────────────────────────────
    if (\!firstName || \!lastName || \!email || \!message) {
      return NextResponse.json(
        { error: msg(locale, 'requiredFields') },
        { status: 400, headers: corsHeaders() }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (\!emailRegex.test(email)) {
      return NextResponse.json(
        { error: msg(locale, 'invalidEmail') },
        { status: 400, headers: corsHeaders() }
      )
    }

    // ── GitHub config ──────────────────────────────────────────────────────
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_REPO = process.env.GITHUB_REPO

    if (\!GITHUB_TOKEN || \!GITHUB_REPO) {
      console.error('Missing GitHub configuration')
      return NextResponse.json(
        { error: msg(locale, 'configError') },
        { status: 500, headers: corsHeaders() }
      )
    }

    const [owner, repo] = GITHUB_REPO.split('/')
    if (\!owner || \!repo) {
      console.error('Invalid GITHUB_REPO format')
      return NextResponse.json(
        { error: msg(locale, 'configError') },
        { status: 500, headers: corsHeaders() }
      )
    }

    // ── Spam scoring ───────────────────────────────────────────────────────
    const spamScore = calculateSpamScore({ firstName, lastName, email, company, message })

    if (spamScore >= 80) {
      return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders() })
    }

    // ── AI lead classification (optional — degrades gracefully) ────────────
    const classification = await classifyLead(message)

    // ── Build GitHub Issue labels ──────────────────────────────────────────
    const labels: string[] = ['contatto']
    if (spamScore >= 50) labels.push('suspected-spam')
    if (classification.intent \!== 'other') labels.push(classification.intent)
    if (classification.urgency === 'high') labels.push('urgent')

    // ── Build GitHub Issue body ────────────────────────────────────────────
    const fullName = `${firstName} ${lastName}`
    const dateStr = new Date().toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const aiSection = classification.summary
      ? `\n## AI Classification\n\n- **Intent:** ${classification.intent}\n- **Urgency:** ${classification.urgency}\n- **Summary:** ${classification.summary}\n`
      : ''

    const contactData = `# Nuovo Contatto

**Nome:** ${firstName}
**Cognome:** ${lastName}
**Email:** ${email}
**Azienda:** ${company || 'Non fornita'}
**Data:** ${dateStr}
${aiSection}
## Messaggio

${message}

---
*Ricevuto dalla landing page*
`

    // ── Create GitHub Issue ────────────────────────────────────────────────
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: `📧 ${fullName}${company ? ' - ' + company : ''}`,
          body: contactData,
          labels,
        }),
      }
    )

    if (\!response.ok) {
      console.error('Failed to save contact', await response.text())
      return NextResponse.json(
        { error: msg(locale, 'saveError') },
        { status: 500, headers: corsHeaders() }
      )
    }

    return NextResponse.json(
      { success: true, message: msg(locale, 'success') },
      { status: 201, headers: corsHeaders() }
    )
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: msg(locale, 'unexpectedError') },
      { status: 500, headers: corsHeaders() }
    )
  }
}

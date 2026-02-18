'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLanguage } from './useLanguage'
import { FormField } from '../components/FormField'
import { buildZodSchema } from '../lib/validation'
import fieldsConfig from '../../config/fields.json'
import type { FormConfig } from '../lib/types'

// Cast the JSON to our typed shape
const config = fieldsConfig as unknown as FormConfig
const fields = config.form.fields

// Build Zod schema once at module level (same schema used by backend)
const schema = buildZodSchema(fields)

type FormValues = Record<string, unknown>

export default function Home() {
  const { t, locale } = useLanguage()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const [success, setSuccess] = [false, (v: boolean) => void v] // managed below
  // Use React state for feedback messages
  const [feedbackState, setFeedbackState] = (function () {
    const { useState } = require('react') as typeof import('react')
    return useState<{ type: 'success' | 'error'; text: string } | null>(null)
  })()

  const onSubmit = async (data: FormValues) => {
    setFeedbackState(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to submit form')
      }

      setFeedbackState({ type: 'success', text: t.messages.success })
      reset()
    } catch (err) {
      setFeedbackState({
        type: 'error',
        text: err instanceof Error ? err.message : t.messages.unexpectedError,
      })
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-background-page">
      <div className="max-w-md w-full bg-background-main rounded-card shadow-card p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">{t.title}</h1>
        <p className="text-text-secondary mb-6">{t.subtitle}</p>

        {feedbackState?.type === 'success' && (
          <div className="mb-6 p-4 bg-success-bg border border-success-border rounded-input">
            <p className="text-success-text font-medium">✓ {feedbackState.text}</p>
          </div>
        )}

        {feedbackState?.type === 'error' && (
          <div className="mb-6 p-4 bg-error-bg border border-error-border rounded-input">
            <p className="text-error-text font-medium">✗ {t.messages.error}: {feedbackState.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Honeypot — hidden from real users, traps bots */}
          <div
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
          >
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              tabIndex={-1}
              autoComplete="off"
              {...register('website')}
            />
          </div>

          {/* Config-driven field rendering in a 2-column grid */}
          <div className="grid grid-cols-2 gap-4">
            {fields.map(field => (
              <FormField
                key={field.id}
                field={field}
                label={t.fields[field.id as keyof typeof t.fields] ?? field.id}
                placeholder={t.placeholders[field.id as keyof typeof t.placeholders]}
                register={register as Parameters<typeof FormField>[0]['register']}
                errors={errors}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-3 px-6 rounded-button font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? t.buttons.submitting : t.buttons.submit}
          </button>
        </form>
      </div>
    </main>
  )
}

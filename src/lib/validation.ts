import { z } from 'zod'
import type { FieldSchema } from './types'

/**
 * Build a Zod schema at runtime from the field config array.
 * Single source of truth for both frontend (react-hook-form) and backend (route.ts).
 */
export function buildZodSchema(fields: FieldSchema[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny

    if (field.type === 'email') {
      let s = z.string().email('Invalid email address')
      if (field.validation?.max) {
        s = s.max(field.validation.max, `Max ${field.validation.max} characters`)
      }
      fieldSchema = s
    } else if (field.type === 'textarea' || field.type === 'text') {
      let s = z.string()
      if (field.validation?.min) {
        s = s.min(field.validation.min, `Min ${field.validation.min} characters required`)
      }
      if (field.validation?.max) {
        s = s.max(field.validation.max, `Max ${field.validation.max} characters`)
      }
      if (field.validation?.pattern) {
        s = s.regex(
          new RegExp(field.validation.pattern),
          field.validation.message ?? 'Invalid format'
        )
      }
      fieldSchema = s
    } else if (field.type === 'number') {
      fieldSchema = z.coerce.number()
    } else {
      // tel, url, select — basic string
      fieldSchema = z.string()
    }

    // Wrap optional fields
    if (!field.required) {
      fieldSchema = (fieldSchema as z.ZodString).optional()
    }

    shape[field.id] = fieldSchema
  }

  return z.object(shape)
}

'use client'

import type { FieldSchema } from '../lib/types'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'

interface FormFieldProps {
  field: FieldSchema
  label: string
  placeholder?: string
  register: UseFormRegister<Record<string, unknown>>
  errors: FieldErrors<Record<string, unknown>>
}

const inputClass =
  'w-full px-4 py-2 border border-border rounded-input focus:ring-2 focus:ring-primary-ring focus:border-transparent text-text-primary'

export function FormField({ field, label, placeholder, register, errors }: FormFieldProps) {
  const error = errors[field.id]
  const errorMessage = error?.message as string | undefined

  const sharedProps = {
    id: field.id,
    placeholder,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${field.id}-error` : undefined,
    className: inputClass,
    ...register(field.id, { required: field.required }),
  }

  return (
    <div className={field.colSpan === 1 ? '' : 'col-span-2'}>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-text-label mb-1"
      >
        {label}
        {field.required && <span className="text-error-text ml-1">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea rows={4} {...sharedProps} />
      ) : field.type === 'select' && field.options ? (
        <select {...sharedProps}>
          <option value="">—</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={field.type} {...sharedProps} />
      )}

      {errorMessage && (
        <p id={`${field.id}-error`} className="mt-1 text-sm text-error-text">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

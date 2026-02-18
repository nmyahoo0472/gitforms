// Field type union — mirrors supported HTML input types
export type FieldType = 'text' | 'email' | 'textarea' | 'select' | 'tel' | 'url' | 'number'

export interface FieldValidation {
  min?: number
  max?: number
  pattern?: string
  message?: string
}

export interface FieldSchema {
  id: string
  type: FieldType
  required: boolean
  /** 1 = half-width, 2 = full-width in 2-column grid */
  colSpan?: 1 | 2
  /** Only for type='select' */
  options?: Array<{ value: string; label: string }>
  validation?: FieldValidation
}

export interface FormFields {
  fields: FieldSchema[]
}

export interface FieldLabels {
  [fieldId: string]: string
}

export interface LocaleLabels {
  it: FieldLabels
  en: FieldLabels
}

export interface FormConfig {
  labels: LocaleLabels
  form: FormFields
}

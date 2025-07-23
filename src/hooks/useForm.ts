import { useState, useCallback, ChangeEvent, FormEvent } from 'react'
import { z, ZodSchema } from 'zod'

export interface UseFormOptions<T> {
  initialValues: T
  validationSchema?: ZodSchema<T>
  onSubmit: (values: T) => void | Promise<void>
  validate?: (values: T) => Record<string, string>
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  validate
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // Update field value
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Clear error when field is updated
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  // Handle input change
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target
    
    let finalValue: any = value
    
    // Handle different input types
    if (type === 'checkbox') {
      finalValue = (event.target as HTMLInputElement).checked
    } else if (type === 'number') {
      finalValue = value === '' ? '' : Number(value)
    } else if (type === 'file') {
      finalValue = (event.target as HTMLInputElement).files
    }

    setValue(name as keyof T, finalValue)
  }, [setValue])

  // Handle field blur
  const handleBlur = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = event.target
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate field on blur
    validateField(name as keyof T)
  }, [])

  // Validate single field
  const validateField = useCallback((name: keyof T) => {
    const fieldErrors: Record<string, string> = {}

    // Zod validation
    if (validationSchema) {
      try {
        validationSchema.parse(values)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            if (err.path.includes(name as string)) {
              fieldErrors[name as string] = err.message
            }
          })
        }
      }
    }

    // Custom validation
    if (validate) {
      const customErrors = validate(values)
      if (customErrors[name as string]) {
        fieldErrors[name as string] = customErrors[name as string]
      }
    }

    setErrors(prev => ({ ...prev, ...fieldErrors }))
    return Object.keys(fieldErrors).length === 0
  }, [values, validationSchema, validate])

  // Validate all fields
  const validateForm = useCallback(() => {
    const formErrors: Record<string, string> = {}

    // Zod validation
    if (validationSchema) {
      try {
        validationSchema.parse(values)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            const field = err.path.join('.')
            formErrors[field] = err.message
          })
        }
      }
    }

    // Custom validation
    if (validate) {
      const customErrors = validate(values)
      Object.assign(formErrors, customErrors)
    }

    setErrors(formErrors)
    const valid = Object.keys(formErrors).length === 0
    setIsValid(valid)
    return valid
  }, [values, validationSchema, validate])

  // Handle form submission
  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault()
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    )
    setTouched(allTouched)

    // Validate form
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(values)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validateForm, onSubmit])

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
    setIsValid(false)
  }, [initialValues])

  // Get field props for easy spreading
  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': touched[name as string] && errors[name as string] ? 'true' : 'false',
    'aria-describedby': errors[name as string] ? `${name as string}-error` : undefined
  }), [values, handleChange, handleBlur, touched, errors])

  // Get error message for field
  const getFieldError = useCallback((name: keyof T) => {
    return touched[name as string] ? errors[name as string] : undefined
  }, [touched, errors])

  // Check if field has error
  const hasFieldError = useCallback((name: keyof T) => {
    return touched[name as string] && !!errors[name as string]
  }, [touched, errors])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateForm,
    reset,
    getFieldProps,
    getFieldError,
    hasFieldError
  }
}
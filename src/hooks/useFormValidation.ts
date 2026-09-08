import { useState, useCallback, useMemo, useRef } from 'react';

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean | string;
  message: string;
}

export interface FieldConfig<T = any> {
  initialValue?: T;
  rules?: ValidationRule<T>[];
  required?: boolean;
  requiredMessage?: string;
}

export type FormConfig<T extends Record<string, any>> = {
  [K in keyof T]?: FieldConfig<T[K]>;
};

interface FieldState {
  value: any;
  error: string | null;
  touched: boolean;
  validating: boolean;
}

interface UseFormValidationReturn<T extends Record<string, any>> {
  values: T;
  errors: Record<keyof T, string | null>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  handleChange: (name: keyof T, value: any) => void;
  handleBlur: (name: keyof T) => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e?: React.FormEvent) => Promise<void>;
  resetForm: (newValues?: Partial<T>) => void;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string) => void;
  validateField: (name: keyof T) => boolean;
  validateAll: () => boolean;
  getFieldProps: (name: keyof T) => {
    name: string;
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    error?: string | null;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  };
}

// Common validation rules
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    },
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      const phoneRegex = /^(\+254|254|0)?[1-9]\d{8}$/;
      return phoneRegex.test(value.replace(/\s/g, ''));
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      return value.length <= max;
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  min: (minValue: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (value === null || value === undefined) return true;
      return Number(value) >= minValue;
    },
    message: message || `Must be at least ${minValue}`,
  }),

  max: (maxValue: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (value === null || value === undefined) return true;
      return Number(value) <= maxValue;
    },
    message: message || `Must be no more than ${maxValue}`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  match: (fieldName: string, getOtherValue: () => any, message?: string): ValidationRule => ({
    validate: (value) => value === getOtherValue(),
    message: message || `Must match ${fieldName}`,
  }),

  custom: (fn: (value: any) => boolean, message: string): ValidationRule => ({
    validate: fn,
    message,
  }),
};

export function useFormValidation<T extends Record<string, any>>(
  config: FormConfig<T>
): UseFormValidationReturn<T> {
  const [fields, setFields] = useState<Record<keyof T, FieldState>>(() => {
    const initial: Record<string, FieldState> = {};
    for (const key in config) {
      initial[key] = {
        value: config[key]?.initialValue ?? '',
        error: null,
        touched: false,
        validating: false,
      };
    }
    return initial as Record<keyof T, FieldState>;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const values = useMemo(() => {
    const result: any = {};
    for (const key in fields) {
      result[key] = fields[key].value;
    }
    return result as T;
  }, [fields]);

  const initialValuesRef = useRef(values);

  const errors = useMemo(() => {
    const result: any = {};
    for (const key in fields) {
      result[key] = fields[key].error;
    }
    return result as Record<keyof T, string | null>;
  }, [fields]);

  const touched = useMemo(() => {
    const result: any = {};
    for (const key in fields) {
      result[key] = fields[key].touched;
    }
    return result as Record<keyof T, boolean>;
  }, [fields]);

  const isValid = useMemo(() => {
    return Object.values(errors).every(e => e === null);
  }, [errors]);

  const isDirty = useMemo(() => {
    for (const key in values) {
      if (values[key] !== initialValuesRef.current[key]) {
        return true;
      }
    }
    return false;
  }, [values]);

  const validateField = useCallback((name: keyof T): boolean => {
    const field = config[name];
    const value = fields[name]?.value;

    if (!field?.rules) return true;

    for (const rule of field.rules) {
      const result = rule.validate(value);
      if (result === false) {
        setFields(prev => ({
          ...prev,
          [name]: { ...prev[name], error: rule.message },
        }));
        return false;
      }
      if (typeof result === 'string') {
        setFields(prev => ({
          ...prev,
          [name]: { ...prev[name], error: result },
        }));
        return false;
      }
    }

    setFields(prev => ({
      ...prev,
      [name]: { ...prev[name], error: null },
    }));
    return true;
  }, [config, fields]);

  const validateAll = useCallback((): boolean => {
    let isAllValid = true;
    for (const name in config) {
      const field = config[name];
      const value = fields[name]?.value;

      if (field?.required && (!value || (typeof value === 'string' && !value.trim()))) {
        setFields(prev => ({
          ...prev,
          [name]: {
            ...prev[name],
            error: field.requiredMessage || 'This field is required',
            touched: true
          },
        }));
        isAllValid = false;
        continue;
      }

      if (!validateField(name)) {
        isAllValid = false;
      }
    }
    return isAllValid;
  }, [config, fields, validateField]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setFields(prev => ({
      ...prev,
      [name]: { ...prev[name], value },
    }));
  }, []);

  const handleBlur = useCallback((name: keyof T) => {
    setFields(prev => ({
      ...prev,
      [name]: { ...prev[name], touched: true },
    }));
    validateField(name);
  }, [validateField]);

  const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
    return async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      // Mark all fields as touched
      setFields(prev => {
        const updated = { ...prev };
        for (const key in updated) {
          updated[key] = { ...updated[key], touched: true };
        }
        return updated;
      });

      const isValid = validateAll();
      if (!isValid) return;

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [validateAll, values]);

  const resetForm = useCallback((newValues?: Partial<T>) => {
    setFields(prev => {
      const updated = { ...prev };
      for (const key in updated) {
        updated[key] = {
          ...updated[key],
          value: newValues?.[key] ?? config[key]?.initialValue ?? '',
          error: null,
          touched: false,
        };
      }
      return updated;
    });
    if (newValues) {
      for (const key in newValues) {
        initialValuesRef.current[key] = newValues[key];
      }
    }
  }, [config]);

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setFields(prev => ({
      ...prev,
      [name]: { ...prev[name], value },
    }));
  }, []);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setFields(prev => ({
      ...prev,
      [name]: { ...prev[name], error },
    }));
  }, []);

  const getFieldProps = useCallback((name: keyof T) => {
    const field = fields[name];
    return {
      name: String(name),
      value: field?.value ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        handleChange(name, e.target.value);
      },
      onBlur: () => handleBlur(name),
      error: field?.error,
      'aria-invalid': field?.touched && !!field?.error,
      'aria-describedby': field?.error ? `${String(name)}-error` : undefined,
    };
  }, [fields, handleChange, handleBlur]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    validateField,
    validateAll,
    getFieldProps,
  };
}

export default useFormValidation;

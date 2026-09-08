import { forwardRef } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  showError?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, required, showError = true, id, className = '', ...props }, ref) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={`form-field ${className}`}>
        <label
          htmlFor={inputId}
          className="block font-sans text-sm font-semibold text-charcoal-800 mb-1.5"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
          {required && (
            <span className="sr-only">(required)</span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="font-sans text-xs text-warm-500 mb-1.5">
            {hint}
          </p>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-required={required}
          aria-invalid={showError && !!error}
          aria-describedby={
            [
              error && showError ? errorId : null,
              hint ? hintId : null,
            ].filter(Boolean).join(' ') || undefined
          }
          className={`w-full px-4 py-3 bg-white border rounded-xl font-sans text-sm text-charcoal-900
            placeholder:text-warm-300 transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500
            ${error && showError
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
              : 'border-cream-300 hover:border-cream-400'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream-50`}
          {...props}
        />

        {error && showError && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 font-sans text-xs text-red-500 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// Textarea version
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  showError?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, hint, required, showError = true, id, className = '', ...props }, ref) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={`form-field ${className}`}>
        <label
          htmlFor={inputId}
          className="block font-sans text-sm font-semibold text-charcoal-800 mb-1.5"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
          {required && (
            <span className="sr-only">(required)</span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="font-sans text-xs text-warm-500 mb-1.5">
            {hint}
          </p>
        )}

        <textarea
          ref={ref}
          id={inputId}
          aria-required={required}
          aria-invalid={showError && !!error}
          aria-describedby={
            [
              error && showError ? errorId : null,
              hint ? hintId : null,
            ].filter(Boolean).join(' ') || undefined
          }
          className={`w-full px-4 py-3 bg-white border rounded-xl font-sans text-sm text-charcoal-900
            placeholder:text-warm-300 transition-colors duration-200 resize-none
            focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500
            ${error && showError
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
              : 'border-cream-300 hover:border-cream-400'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream-50`}
          {...props}
        />

        {error && showError && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 font-sans text-xs text-red-500 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// Select version
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  showError?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, hint, required, showError = true, id, className = '', options, placeholder, ...props }, ref) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={`form-field ${className}`}>
        <label
          htmlFor={inputId}
          className="block font-sans text-sm font-semibold text-charcoal-800 mb-1.5"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
          {required && (
            <span className="sr-only">(required)</span>
          )}
        </label>

        {hint && (
          <p id={hintId} className="font-sans text-xs text-warm-500 mb-1.5">
            {hint}
          </p>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-required={required}
            aria-invalid={showError && !!error}
            aria-describedby={
              [
                error && showError ? errorId : null,
                hint ? hintId : null,
              ].filter(Boolean).join(' ') || undefined
            }
            className={`w-full px-4 py-3 bg-white border rounded-xl font-sans text-sm text-charcoal-900
              appearance-none cursor-pointer transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500
              ${error && showError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
                : 'border-cream-300 hover:border-cream-400'
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream-50`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && showError && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 font-sans text-xs text-red-500 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

export default FormField;

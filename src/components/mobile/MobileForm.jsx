import { useState, useCallback, memo, forwardRef } from 'react';
import { ChevronDown, AlertCircle, Check } from 'lucide-react';

// Input field
const MobileInput = memo(forwardRef(function MobileInput({
  label,
  error,
  hint,
  required = false,
  type = 'text',
  className = '',
  ...props
}, ref) {
  return (
    <div className={`mobile-form__group ${className}`}>
      {label && (
        <label className={`mobile-form__label ${required ? 'mobile-form__label--required' : ''}`}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`mobile-form__input ${error ? 'mobile-form__input--error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.name}-error` : hint ? `${props.name}-hint` : undefined}
        {...props}
      />
      {error && (
        <span className="mobile-form__error" id={`${props.name}-error`} role="alert">
          <AlertCircle size={12} />
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="mobile-form__hint" id={`${props.name}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}));

// Textarea
const MobileTextarea = memo(forwardRef(function MobileTextarea({
  label,
  error,
  hint,
  required = false,
  rows = 4,
  className = '',
  ...props
}, ref) {
  return (
    <div className={`mobile-form__group ${className}`}>
      {label && (
        <label className={`mobile-form__label ${required ? 'mobile-form__label--required' : ''}`}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`mobile-form__input ${error ? 'mobile-form__input--error' : ''}`}
        style={{ minHeight: rows * 24 + 32, resize: 'vertical' }}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <span className="mobile-form__error" role="alert">{error}</span>
      )}
      {hint && !error && (
        <span className="mobile-form__hint">{hint}</span>
      )}
    </div>
  );
}));

// Select dropdown
const MobileSelect = memo(forwardRef(function MobileSelect({
  label,
  error,
  hint,
  required = false,
  options = [],
  placeholder = 'Select an option',
  className = '',
  ...props
}, ref) {
  return (
    <div className={`mobile-form__group ${className}`}>
      {label && (
        <label className={`mobile-form__label ${required ? 'mobile-form__label--required' : ''}`}>
          {label}
        </label>
      )}
      <div className="mobile-form__select">
        <select
          ref={ref}
          className={`mobile-form__input ${error ? 'mobile-form__input--error' : ''}`}
          aria-invalid={!!error}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="mobile-form__select-arrow" />
      </div>
      {error && (
        <span className="mobile-form__error" role="alert">{error}</span>
      )}
      {hint && !error && (
        <span className="mobile-form__hint">{hint}</span>
      )}
    </div>
  );
}));

// Checkbox
function MobileCheckbox({
  label,
  checked,
  onChange,
  error,
  className = '',
  ...props
}) {
  return (
    <label className={`mobile-form__checkbox ${checked ? 'mobile-form__checkbox--checked' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        {...props}
      />
      <div className="mobile-form__checkbox-box">
        <Check size={14} className="mobile-form__checkbox-check" />
      </div>
      {label && (
        <span className="mobile-form__checkbox-label">{label}</span>
      )}
    </label>
  );
}

// Radio group
function MobileRadioGroup({
  label,
  options = [],
  value,
  onChange,
  error,
  className = '',
}) {
  return (
    <div className={`mobile-form__group ${className}`}>
      {label && (
        <label className="mobile-form__label">{label}</label>
      )}
      <div className="mobile-form__radio-group">
        {options.map(opt => (
          <div
            key={opt.value}
            className={`mobile-form__radio ${value === opt.value ? 'mobile-form__radio--selected' : ''}`}
            onClick={() => onChange?.(opt.value)}
            role="radio"
            aria-checked={value === opt.value}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange?.(opt.value);
              }
            }}
          >
            <div className="mobile-form__radio-dot" />
            <div>
              <div className="mobile-form__checkbox-label" style={{ fontWeight: 500 }}>
                {opt.label}
              </div>
              {opt.description && (
                <div style={{ fontSize: 'var(--mobile-text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  {opt.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <span className="mobile-form__error" role="alert">{error}</span>
      )}
    </div>
  );
}

// Toggle switch
function MobileToggle({
  label,
  checked,
  onChange,
  description,
  className = '',
}) {
  return (
    <label className={`mobile-form__checkbox ${className}`} style={{
      background: checked ? 'var(--gold-100)' : 'var(--surface)',
      borderRadius: 'var(--mobile-radius-md)',
      padding: 'var(--mobile-space-4)',
      border: `1px solid ${checked ? 'var(--gold-400)' : 'var(--border)'}`,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <div style={{ flex: 1 }}>
        <div className="mobile-form__checkbox-label" style={{ fontWeight: 600 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 'var(--mobile-text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      <div
        style={{
          width: 52,
          height: 32,
          borderRadius: 16,
          background: checked ? 'var(--gold-500)' : 'var(--bg-muted)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: 'white',
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            transition: 'left 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </label>
  );
}

// Form section (grouped fields)
function MobileFormSection({ title, children, className = '' }) {
  return (
    <div className={className} style={{ marginBottom: 'var(--mobile-space-6)' }}>
      {title && (
        <h3 style={{
          fontSize: 'var(--mobile-text-sm)',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--mobile-space-3)',
          padding: '0 var(--mobile-space-1)',
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// Price input with currency
function MobilePriceInput({ label, value, onChange, currency = 'KES', ...props }) {
  return (
    <div className="mobile-form__group">
      {label && (
        <label className="mobile-form__label">{label}</label>
      )}
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{
          background: 'var(--bg-muted)',
          border: '1.5px solid var(--border)',
          borderRight: 'none',
          borderRadius: 'var(--mobile-radius-md) 0 0 var(--mobile-radius-md)',
          padding: 'var(--mobile-space-4)',
          color: 'var(--text-muted)',
          fontSize: 'var(--mobile-text-base)',
          display: 'flex',
          alignItems: 'center',
          minHeight: 'var(--touch-target-comfortable)',
        }}>
          {currency}
        </div>
        <input
          type="number"
          value={value}
          onChange={onChange}
          className="mobile-form__input"
          style={{
            borderRadius: '0 var(--mobile-radius-md) var(--mobile-radius-md) 0',
            flex: 1,
          }}
          {...props}
        />
      </div>
    </div>
  );
}

// Phone input with country code
function MobilePhoneInput({ label, value, onChange, ...props }) {
  return (
    <div className="mobile-form__group">
      {label && (
        <label className="mobile-form__label">{label}</label>
      )}
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{
          background: 'var(--bg-muted)',
          border: '1.5px solid var(--border)',
          borderRight: 'none',
          borderRadius: 'var(--mobile-radius-md) 0 0 var(--mobile-radius-md)',
          padding: 'var(--mobile-space-4)',
          color: 'var(--text-muted)',
          fontSize: 'var(--mobile-text-base)',
          display: 'flex',
          alignItems: 'center',
          minHeight: 'var(--touch-target-comfortable)',
        }}>
          🇰🇪 +254
        </div>
        <input
          type="tel"
          value={value}
          onChange={onChange}
          className="mobile-form__input"
          placeholder="712 345 678"
          style={{
            borderRadius: '0 var(--mobile-radius-md) var(--mobile-radius-md) 0',
            flex: 1,
          }}
          {...props}
        />
      </div>
    </div>
  );
}

export {
  MobileInput,
  MobileTextarea,
  MobileSelect,
  MobileCheckbox,
  MobileRadioGroup,
  MobileToggle,
  MobileFormSection,
  MobilePriceInput,
  MobilePhoneInput,
};

export default {
  Input: MobileInput,
  Textarea: MobileTextarea,
  Select: MobileSelect,
  Checkbox: MobileCheckbox,
  RadioGroup: MobileRadioGroup,
  Toggle: MobileToggle,
  Section: MobileFormSection,
  PriceInput: MobilePriceInput,
  PhoneInput: MobilePhoneInput,
};

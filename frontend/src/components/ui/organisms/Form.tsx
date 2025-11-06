import React from 'react';
import { cn } from '@/utils/cn';
import { Button } from '../atoms/Button';
import { Alert } from '../molecules/Alert';

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => string | undefined;
  };
  helperText?: string;
  defaultValue?: any;
}

export interface FormProps {
  fields: FormFieldConfig[];
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  submitText?: string;
  submitVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  submitSize?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  success?: string;
  className?: string;
  fieldClassName?: string;
  initialValues?: Record<string, any>;
  renderField?: (field: FormFieldConfig, value: any, onChange: (value: any) => void, error?: string) => React.ReactNode;
}

export const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  submitText = 'Submit',
  submitVariant = 'primary',
  submitSize = 'md',
  loading = false,
  disabled = false,
  error,
  success,
  className,
  fieldClassName,
  initialValues = {},
  renderField,
}) => {
  const [values, setValues] = React.useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateField = (field: FormFieldConfig, value: any): string | undefined => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} is required`;
    }

    if (!value) return undefined;

    const { validation } = field;
    if (!validation) return undefined;

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
      return `${field.label} must be at least ${validation.minLength} characters`;
    }

    if (validation.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
      return `${field.label} must not exceed ${validation.maxLength} characters`;
    }

    if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
      return `${field.label} must be at least ${validation.min}`;
    }

    if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
      return `${field.label} must not exceed ${validation.max}`;
    }

    if (validation.custom) {
      return validation.custom(value);
    }

    return undefined;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched[fieldName]) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
      }
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const field = fields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, values[fieldName]);
      setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    
    fields.forEach(field => {
      newTouched[field.name] = true;
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    
    setErrors(newErrors);
    setTouched(newTouched);
    
    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit(values);
      } catch (err) {
        // Error handling is managed by the parent component
      }
    }
  };

  const renderDefaultField = (field: FormFieldConfig, value: any, onChange: (value: any) => void, error?: string) => {
    const commonProps = {
      name: field.name,
      value,
      onChange: (e: any) => onChange(field.type === 'checkbox' || field.type === 'switch' ? e.target.checked : e.target.value),
      onBlur: () => handleFieldBlur(field.name),
      placeholder: field.placeholder,
      disabled: disabled || field.disabled,
      error: touched[field.name] ? error : undefined,
      helperText: field.helperText,
      required: field.required,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            className={cn(
              'input',
              'min-h-[100px]',
              error && 'input-error'
            )}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            className={cn(
              'input',
              'appearance-none',
              error && 'input-error'
            )}
          >
            {field.placeholder && (
              <option value="" disabled>
                {field.placeholder}
              </option>
            )}
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            {...commonProps}
            checked={value}
            className={cn(
              'rounded border-neutral-300 text-primary-600 focus:ring-primary-500',
              error && 'border-error-500'
            )}
          />
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={disabled || field.disabled}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'switch':
        return (
          <button
            type="button"
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            disabled={disabled || field.disabled}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              value ? 'bg-primary-600' : 'bg-neutral-200',
              (disabled || field.disabled) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                value ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        );

      default:
        return (
          <input
            type={field.type}
            {...commonProps}
            className={cn(
              'input',
              error && 'input-error'
            )}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {error && (
        <Alert variant="error" closable>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" closable>
          {success}
        </Alert>
      )}

      {fields.map(field => {
        const value = values[field.name] ?? field.defaultValue ?? '';
        const error = errors[field.name];

        return (
          <div key={field.name} className={cn('space-y-2', fieldClassName)}>
            {field.type !== 'checkbox' && field.type !== 'switch' && (
              <label className="block text-sm font-medium text-text-primary">
                {field.label}
                {field.required && (
                  <span className="text-error-500 ml-1" aria-label="required">
                    *
                  </span>
                )}
              </label>
            )}

            {renderField ? (
              renderField(field, value, (newValue) => handleFieldChange(field.name, newValue), error)
            ) : (
              renderDefaultField(field, value, (newValue) => handleFieldChange(field.name, newValue), error)
            )}

            {touched[field.name] && error && (
              <p className="text-sm text-error-600" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button
          type="submit"
          variant={submitVariant}
          size={submitSize}
          loading={loading}
          disabled={disabled || loading}
        >
          {submitText}
        </Button>
      </div>
    </form>
  );
};
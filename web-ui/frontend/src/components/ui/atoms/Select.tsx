import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'error' | 'success';
  fullWidth?: boolean;
  required?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      options,
      placeholder,
      size = 'md',
      variant = error ? 'error' : success ? 'success' : 'plain',
      fullWidth = true,
      required = false,
      id,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${React.useId()}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const hasError = !!error;
    const hasSuccess = !!success;
    const isDisabled = disabled;

    const sizeClasses = {
      sm: 'text-sm px-3 py-2 h-input-sm',
      md: 'text-base px-3 py-2 h-input-md',
      lg: 'text-lg px-4 py-3 h-input-lg',
    };

    const baseClasses = cn(
      'input',
      'appearance-none',
      'bg-[url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzY0NzQ4YiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+)]',
      'bg-no-repeat',
      'bg-right-3',
      'bg-center',
      'pr-10',
      sizeClasses[size],
      variant === 'error' && 'input-error',
      variant === 'success' && 'input-success',
      fullWidth ? 'w-full' : '',
      className
    );

    const displayValue = value || '';

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : '')}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
            {required && (
              <span className="text-error-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={baseClasses}
            aria-invalid={hasError}
            aria-describedby={cn(
              errorId,
              helperId,
              hasError ? 'error-description' : undefined
            )}
            disabled={isDisabled}
            value={displayValue}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-text-muted"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        
        {error && (
          <p
            id={errorId}
            className="text-sm text-error-600 flex items-center"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {success && !error && (
          <p
            id={`${selectId}-success`}
            className="text-sm text-success-600 flex items-center"
            aria-live="polite"
          >
            {success}
          </p>
        )}
        
        {helperText && !error && !success && (
          <p
            id={helperId}
            className={cn(
              'text-sm',
              isDisabled ? 'text-text-disabled' : 'text-text-muted'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
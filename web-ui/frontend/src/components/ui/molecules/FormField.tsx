import React from 'react';
import { cn } from '@/utils/cn';

export interface FormFieldProps {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  success,
  helperText,
  required = false,
  disabled = false,
  className,
  children,
}) => {
  const fieldId = React.useId();
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={fieldId}
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

      <div
        aria-invalid={hasError}
        aria-describedby={cn(
          errorId,
          helperId,
          hasError ? 'error-description' : undefined
        )}
        aria-disabled={disabled}
      >
        {React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          'aria-invalid': hasError,
          'aria-describedby': cn(
            errorId,
            helperId,
            hasError ? 'error-description' : undefined
          ),
          disabled,
        } as any)}
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
          id={`${fieldId}-success`}
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
            disabled ? 'text-text-disabled' : 'text-text-muted'
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
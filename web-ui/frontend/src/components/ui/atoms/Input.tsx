import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'error' | 'success';
  fullWidth?: boolean;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      variant = error ? 'error' : success ? 'success' : 'plain',
      fullWidth = true,
      required = false,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${React.useId()}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const hasError = !!error;
    const hasSuccess = !!success;
    const isDisabled = disabled;

    const baseClasses = 'input';
    const variantClasses = `input-${variant}`;
    const sizeClasses = `input-${size}`;
    const widthClasses = fullWidth ? 'w-full' : '';
   const iconPaddingClasses = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';
    const bothIconPaddingClasses = leftIcon && rightIcon ? 'pl-10 pr-10' : '';
    
    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : '')}>
        {label && (
          <label
            htmlFor={inputId}
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
          {leftIcon && (
            <div
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseClasses,
              variantClasses,
              sizeClasses,
              widthClasses,
              iconPaddingClasses,
              bothIconPaddingClasses,
              className
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              errorId,
              helperId,
              hasError ? 'error-description' : undefined
            )}
            disabled={isDisabled}
            {...props}
          />
          
          {rightIcon && (
            <div
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
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
            id={`${inputId}-success`}
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

Input.displayName = 'Input';

export { Input };
import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'button';
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      size = 'md',
      variant = 'default',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const radioId = id || `radio-${React.useId()}`;
    const errorId = error ? `${radioId}-error` : undefined;
    const helperId = helperText ? `${radioId}-helper` : undefined;
    const hasError = !!error;

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    const baseInputClasses = cn(
      'text-primary-600 border-neutral-300 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 transition-colors duration-200',
      sizeClasses[size],
      disabled && 'opacity-50 cursor-not-allowed',
      hasError && 'border-error-500 focus:ring-error-500'
    );

    const variantClasses = {
      default: 'flex items-start',
      card: 'border-2 p-4 rounded-lg hover:bg-surface-variant transition-colors duration-200 cursor-pointer',
      button: 'border-2 px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors duration-200 cursor-pointer flex items-center gap-2',
    }[variant];

    const isButtonVariant = variant === 'button';
    const showInput = !isButtonVariant || checked;

    return (
      <div className={variantClasses}>
        {showInput && (
          <input
            ref={ref}
            type="radio"
            id={radioId}
            className={cn(
              baseInputClasses,
              !isButtonVariant && 'mt-0.5',
              isButtonVariant && 'sr-only',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={cn(
              errorId,
              helperId
            )}
            disabled={disabled}
            checked={checked}
            {...props}
          />
        )}
        
        {label && (
          <label
            htmlFor={radioId}
            className={cn(
              isButtonVariant ? 'cursor-pointer' : 'ml-2 cursor-pointer',
              'font-medium text-text-primary select-none',
              labelSizeClasses[size],
              disabled && 'cursor-not-allowed opacity-50',
              checked && variant === 'button' && 'bg-primary-100 border-primary-500 text-primary-700'
            )}
          >
            {label}
          </label>
        )}
        
        {error && (
          <p
            id={errorId}
            className="text-sm text-error-600 mt-1"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p
            id={helperId}
            className={cn(
              'text-sm mt-1',
              disabled ? 'text-text-disabled' : 'text-text-muted'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export { Radio };
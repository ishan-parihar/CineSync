import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card';
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
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
    const switchId = id || `switch-${React.useId()}`;
    const errorId = error ? `${switchId}-error` : undefined;
    const helperId = helperText ? `${switchId}-helper` : undefined;
    const hasError = !!error;

    const sizeClasses = {
      sm: {
        track: 'w-8 h-5',
        thumb: 'w-3 h-3',
        translate: 'translate-x-3',
      },
      md: {
        track: 'w-11 h-6',
        thumb: 'w-4 h-4',
        translate: 'translate-x-5',
      },
      lg: {
        track: 'w-14 h-8',
        thumb: 'w-6 h-6',
        translate: 'translate-x-6',
      },
    };

    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    const variantClasses = {
      default: 'flex items-start',
      card: 'border-2 p-4 rounded-lg hover:bg-surface-variant transition-colors duration-200',
    }[variant];

    return (
      <div className={cn(variantClasses, 'space-y-2')}>
        <div className="flex items-start">
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-describedby={cn(
              errorId,
              helperId
            )}
            disabled={disabled}
            className={cn(
              'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              sizeClasses[size].track,
              checked
                ? 'bg-primary-600'
                : 'bg-neutral-200',
              disabled && 'opacity-50 cursor-not-allowed',
              hasError && 'border-error-500 focus:ring-error-500',
              className
            )}
            onClick={() => {
              if (!disabled && ref && 'current' in ref && ref.current) {
                ref.current.click();
              }
            }}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out',
                sizeClasses[size].thumb,
                checked ? sizeClasses[size].translate : 'translate-x-0'
              )}
            />
          </button>
          
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className="sr-only"
            aria-invalid={hasError}
            disabled={disabled}
            checked={checked}
            {...props}
          />
          
          {label && (
            <label
              htmlFor={switchId}
              className={cn(
                'ml-3 font-medium text-text-primary select-none cursor-pointer',
                labelSizeClasses[size],
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
          )}
        </div>
        
        {error && (
          <p
            id={errorId}
            className="text-sm text-error-600"
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
              'text-sm',
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

Switch.displayName = 'Switch';

export { Switch };
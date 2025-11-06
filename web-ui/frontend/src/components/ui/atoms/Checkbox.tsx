import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      indeterminate = false,
      size = 'md',
      variant = 'default',
      id,
      disabled,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isIndeterminate, setIsIndeterminate] = React.useState(indeterminate);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = isIndeterminate;
      }
    }, [isIndeterminate]);

    React.useEffect(() => {
      setIsIndeterminate(indeterminate);
    }, [indeterminate]);

    const checkboxId = id || `checkbox-${React.useId()}`;
    const errorId = error ? `${checkboxId}-error` : undefined;
    const helperId = helperText ? `${checkboxId}-helper` : undefined;
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
      'rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 transition-colors duration-200',
      sizeClasses[size],
      disabled && 'opacity-50 cursor-not-allowed',
      hasError && 'border-error-500 focus:ring-error-500'
    );

    const variantClasses = {
      default: '',
      card: 'border-2 p-4 rounded-lg hover:bg-surface-variant transition-colors duration-200',
    }[variant];

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsIndeterminate(false);
      onChange?.(e);
    };

    return (
      <div className={cn(variant === 'card' ? 'space-y-2' : 'flex items-start', variantClasses)}>
        <div className="flex items-start">
          <input
            ref={(node) => {
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
              inputRef.current = node;
            }}
            type="checkbox"
            id={checkboxId}
            className={cn(baseInputClasses, className)}
            aria-invalid={hasError}
            aria-describedby={cn(
              errorId,
              helperId
            )}
            disabled={disabled}
            checked={checked}
            onChange={handleCheckboxChange}
            {...props}
          />
          
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'ml-2 font-medium text-text-primary select-none cursor-pointer',
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

Checkbox.displayName = 'Checkbox';

export { Checkbox };
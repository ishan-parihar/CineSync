import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'error' | 'success';
  fullWidth?: boolean;
  required?: boolean;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  showCount?: boolean;
  maxLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      size = 'md',
      variant = error ? 'error' : success ? 'success' : 'plain',
      fullWidth = true,
      required = false,
      resize = 'vertical',
      showCount = false,
      maxLength,
      id,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${React.useId()}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const hasError = !!error;
    const hasSuccess = !!success;
    const isDisabled = disabled;
    
    const [characterCount, setCharacterCount] = React.useState(
      typeof value === 'string' ? value.length : 0
    );

    const sizeClasses = {
      sm: 'text-sm px-3 py-2 min-h-[80px]',
      md: 'text-base px-3 py-2 min-h-[100px]',
      lg: 'text-lg px-4 py-3 min-h-[120px]',
    };

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y',
    };

    const baseClasses = cn(
      'input',
      'block',
      sizeClasses[size],
      resizeClasses[resize],
      variant === 'error' && 'input-error',
      variant === 'success' && 'input-success',
      fullWidth ? 'w-full' : '',
      className
    );

    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharacterCount(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharacterCount(e.target.value.length);
      props.onChange?.(e);
    };

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : '')}>
        {label && (
          <label
            htmlFor={textareaId}
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
        
        <textarea
          ref={ref}
          id={textareaId}
          className={baseClasses}
          aria-invalid={hasError}
          aria-describedby={cn(
            errorId,
            helperId,
            hasError ? 'error-description' : undefined
          )}
          disabled={isDisabled}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          {...props}
        />
        
        {(showCount || maxLength || helperText || error || success) && (
          <div className="flex items-center justify-between">
            <div className="flex-1">
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
                  id={`${textareaId}-success`}
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
            
            {(showCount || maxLength) && (
              <div className="text-sm text-text-muted ml-4">
                {characterCount}
                {maxLength && ` / ${maxLength}`}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
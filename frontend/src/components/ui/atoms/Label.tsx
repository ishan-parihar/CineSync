import React, { forwardRef, LabelHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  variant?: 'default' | 'muted' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  (
    {
      className,
      children,
      required = false,
      variant = 'default',
      size = 'md',
      ...props
    },
    ref
  ) => {
    const baseClasses = 'block font-medium';
    
    const variantClasses = {
      default: 'text-text-primary',
      muted: 'text-text-muted',
      error: 'text-error-600',
    }[variant];
    
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    }[size];
    
    return (
      <label
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses,
          sizeClasses,
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-error-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';

export { Label };
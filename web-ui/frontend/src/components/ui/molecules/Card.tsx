import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  loading?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'card';
    
    const variantClasses = {
      default: '',
      interactive: 'card-interactive',
      elevated: 'card-elevated',
      flat: 'card-flat',
    }[variant];
    
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    }[padding];
    
    const hoverableClasses = hoverable ? 'hover:shadow-lg transition-shadow duration-200' : '';
    const loadingClasses = loading ? 'opacity-50 pointer-events-none' : '';
    
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses,
          paddingClasses,
          hoverableClasses,
          loadingClasses,
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
            <div className="spinner spinner-md" aria-label="Loading card content" />
          </div>
        )}
        
        <div className={loading ? 'opacity-0' : ''}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
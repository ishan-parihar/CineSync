import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      dot = false,
      removable = false,
      onRemove,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'badge';
    const variantClasses = `badge-${variant}`;
    
    const sizeClasses = {
      sm: 'text-xs px-1.5 py-0.5',
      md: 'text-xs px-2 py-1',
      lg: 'text-sm px-3 py-1.5',
    }[size];
    
    const dotClasses = dot ? 'flex items-center gap-1.5' : '';
    
    return (
      <span
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses,
          sizeClasses,
          dotClasses,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className="w-2 h-2 rounded-full bg-current"
            aria-hidden="true"
          />
        )}
        
        <span>{children}</span>
        
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 hover:opacity-70 focus:outline-none focus-ring rounded-sm p-0.5"
            aria-label="Remove badge"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
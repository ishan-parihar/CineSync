import React from 'react';
import { cn } from '@/utils/cn';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  size = 'md',
  title,
  description,
  icon,
  closable = false,
  onClose,
  className,
  children,
}) => {
  const defaultIcons = {
    info: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </Icon>
    ),
    success: (
      <Icon>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </Icon>
    ),
    warning: (
      <Icon>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </Icon>
    ),
    error: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </Icon>
    ),
  };

  const variantClasses = {
    info: {
      container: 'bg-info-50 border-info-200 text-info-800',
      icon: 'text-info-600',
      title: 'text-info-900',
      description: 'text-info-700',
    },
    success: {
      container: 'bg-success-50 border-success-200 text-success-800',
      icon: 'text-success-600',
      title: 'text-success-900',
      description: 'text-success-700',
    },
    warning: {
      container: 'bg-warning-50 border-warning-200 text-warning-800',
      icon: 'text-warning-600',
      title: 'text-warning-900',
      description: 'text-warning-700',
    },
    error: {
      container: 'bg-error-50 border-error-200 text-error-800',
      icon: 'text-error-600',
      title: 'text-error-900',
      description: 'text-error-700',
    },
  };

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-5 text-lg',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const currentVariant = variantClasses[variant];
  const currentSize = sizeClasses[size];
  const currentIconSize = iconSizeClasses[size];

  return (
    <div
      className={cn(
        'rounded-lg border',
        currentVariant.container,
        currentSize,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        {/* Icon */}
        <div className={cn('flex-shrink-0', currentVariant.icon)}>
          {icon || defaultIcons[variant]}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('font-medium', currentVariant.title)}>
              {title}
            </h3>
          )}
          
          {(description || children) && (
            <div className={cn(
              title ? 'mt-1' : '',
              currentVariant.description
            )}>
              {description}
              {children}
            </div>
          )}
        </div>

        {/* Close button */}
        {closable && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Dismiss alert"
                className={cn(
                  'inline-flex rounded-md p-1.5',
                  currentVariant.icon,
                  'hover:bg-black/10'
                )}
              >
                <Icon size="sm">
                  <path d="M6 18L18 6M6 6l12 12" />
                </Icon>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
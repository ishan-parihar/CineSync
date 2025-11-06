import React from 'react';
import { cn } from '@/utils/cn';

export interface ProgressProps {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  showPercentage?: boolean;
  striped?: boolean;
  animated?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  showPercentage = false,
  striped = false,
  animated = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'progress-sm',
    md: 'progress-md',
    lg: 'progress-lg',
  };

  const variantClasses = {
    default: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    error: 'bg-error-600',
  };

  const stripeClasses = striped
    ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,.1)_10px,rgba(255,255,255,.1)_20px)]'
    : '';

  const animateClasses = animated && striped ? 'animate-pulse' : '';

  return (
    <div className={cn('space-y-2', className)}>
      {(showLabel || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-text-primary">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-text-secondary">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'progress',
          sizeClasses[size],
          'overflow-hidden'
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn(
            'progress-bar',
            variantClasses[variant],
            stripeClasses,
            animateClasses
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
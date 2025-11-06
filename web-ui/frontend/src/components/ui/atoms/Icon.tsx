import React, { forwardRef, SVGProps } from 'react';
import { cn } from '@/utils/cn';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  color?: string;
}

const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      className,
      size = 'md',
      color,
      children,
      width,
      height,
      style,
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      xs: 12,
      sm: 16,
      md: 20,
      lg: 24,
      xl: 32,
      '2xl': 48,
    };

    const iconSize = typeof size === 'number' ? size : sizeMap[size];
    const iconStyle = {
      ...style,
      color,
    };

    return (
      <svg
        ref={ref}
        width={width || iconSize}
        height={height || iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('flex-shrink-0', className)}
        style={iconStyle}
        {...props}
      >
        {children}
      </svg>
    );
  }
);

Icon.displayName = 'Icon';

export { Icon };
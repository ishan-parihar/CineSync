import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  status?: 'online' | 'offline' | 'busy' | 'error';
  bordered?: boolean;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = '',
      size = 'md',
      fallback,
      status,
      bordered = false,
      children,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    const sizeClasses = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
      '2xl': 'w-20 h-20 text-2xl',
    };

    const statusSizeClasses = {
      xs: 'w-2 h-2',
      sm: 'w-2.5 h-2.5',
      md: 'w-3 h-3',
      lg: 'w-3.5 h-3.5',
      xl: 'w-4 h-4',
      '2xl': 'w-5 h-5',
    };

    const statusClasses = {
      online: 'status-online',
      offline: 'status-offline',
      busy: 'status-busy',
      error: 'status-error',
    };

    const borderClasses = bordered ? 'ring-2 ring-surface ring-offset-2' : '';

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
    };

    const showFallback = !src || imageError || !imageLoaded;

    const handleImageError = () => {
      setImageError(true);
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 font-medium overflow-hidden',
          sizeClasses[size],
          borderClasses,
          className
        )}
        {...props}
      >
        {src && !imageError && (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        )}

        {showFallback && (
          <>
            {fallback ? (
              <span className="truncate">
                {getInitials(fallback)}
              </span>
            ) : (
              children
            )}
          </>
        )}

        {status && (
          <span
            className={cn(
              'absolute -bottom-0 -right-0 rounded-full border-2 border-surface',
              statusSizeClasses[size],
              statusClasses[status]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar };
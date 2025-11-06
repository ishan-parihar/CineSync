import React from 'react';
import { cn } from '@/utils/cn';

export interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  sidebar,
  children,
  className,
  headerClassName,
  contentClassName,
  maxWidth = 'lg',
  padding = 'md',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const contentPaddingClasses = {
    none: '',
    sm: 'px-4 py-6',
    md: 'px-6 py-8',
    lg: 'px-8 py-10',
  };

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Header */}
      {(title || subtitle || breadcrumbs || actions) && (
        <header className={cn('border-b border-border bg-surface', paddingClasses[padding], headerClassName)}>
          <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-text-muted mb-4" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <span className="text-text-muted" aria-hidden="true">
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="hover:text-text-primary transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-text-primary font-medium">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && (
                  <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 text-text-secondary">
                    {subtitle}
                  </p>
                )}
              </div>

              {actions && (
                <div className="ml-6 flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn('flex-1', contentPaddingClasses[padding], contentClassName)}>
        <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
          <div className={cn('flex gap-6', sidebar ? 'lg:flex' : '')}>
            {/* Sidebar */}
            {sidebar && (
              <aside className="lg:w-64 lg:flex-shrink-0">
                <div className="sticky top-6 space-y-6">
                  {sidebar}
                </div>
              </aside>
            )}

            {/* Content */}
            <div className={cn('flex-1', sidebar ? 'min-w-0' : '')}>
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
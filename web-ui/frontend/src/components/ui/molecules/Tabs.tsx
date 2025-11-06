import React, { useState } from 'react';
import { cn } from '@/utils/cn';

export interface TabOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  content: React.ReactNode;
}

export interface TabsProps {
  options: TabOption[];
  defaultValue?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  options,
  defaultValue,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  className,
  onChange,
}) => {
  const [activeValue, setActiveValue] = useState(defaultValue || options[0]?.value || '');

  const handleTabChange = (value: string) => {
    if (!options.find(opt => opt.value === value)?.disabled) {
      setActiveValue(value);
      onChange?.(value);
    }
  };

  const activeTab = options.find(opt => opt.value === activeValue);

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  const variantClasses = {
    default: {
      tablist: 'border-b border-border',
      tab: cn(
        'border-b-2 border-transparent font-medium text-text-secondary',
        'hover:text-text-primary focus:outline-none focus-ring rounded-t-md',
        'data-[active]:border-primary-500 data-[active]:text-primary-600'
      ),
    },
    pills: {
      tablist: 'bg-surface-variant rounded-lg p-1 gap-1',
      tab: cn(
        'rounded-md font-medium text-text-secondary',
        'hover:text-text-primary focus:outline-none focus-ring',
        'data-[active]:bg-surface data-[active]:text-primary-600 data-[active]:shadow'
      ),
    },
    underline: {
      tablist: '',
      tab: cn(
        'font-medium text-text-secondary border-b-2 border-transparent',
        'hover:text-text-primary focus:outline-none focus-ring',
        'data-[active]:border-primary-500 data-[active]:text-primary-600'
      ),
    },
  };

  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  };

  const currentVariantClasses = variantClasses[variant];

  return (
    <div className={cn('w-full', className)}>
      {/* Tab List */}
      <div
        className={cn(
          'flex',
          orientationClasses[orientation],
          currentVariantClasses.tablist,
          variant === 'default' && orientation === 'horizontal' && '-mb-px',
          variant === 'pills' && (orientation === 'horizontal' ? 'flex' : 'inline-flex')
        )}
        role="tablist"
        aria-orientation={orientation}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={activeValue === option.value}
            aria-controls={`tabpanel-${option.value}`}
            data-active={activeValue === option.value}
            disabled={option.disabled}
            className={cn(
              'flex items-center gap-2 transition-colors duration-200',
              currentVariantClasses.tab,
              sizeClasses[size],
              option.disabled && 'opacity-50 cursor-not-allowed',
              variant === 'pills' && 'flex-1 justify-center'
            )}
            onClick={() => handleTabChange(option.value)}
          >
            {option.icon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panel */}
      <div className="mt-4">
        {activeTab && (
          <div
            key={activeTab.value}
            role="tabpanel"
            id={`tabpanel-${activeTab.value}`}
            aria-labelledby={`tab-${activeTab.value}`}
            tabIndex={0}
          >
            {activeTab.content}
          </div>
        )}
      </div>
    </div>
  );
};
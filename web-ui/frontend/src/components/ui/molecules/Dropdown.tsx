import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  options,
  placement = 'bottom-start',
  size = 'md',
  variant = 'primary',
  className,
  disabled = false,
  closeOnSelect = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const placementClasses = {
    'bottom-start': 'top-full left-0 mt-1',
    'bottom-end': 'top-full right-0 mt-1',
    'top-start': 'bottom-full left-0 mb-1',
    'top-end': 'bottom-full right-0 mb-1',
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (option: DropdownOption) => {
    if (!option.disabled) {
      option.onClick?.();
      if (closeOnSelect) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
    } else {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const firstOption = dropdownRef.current?.querySelector('[role="menuitem"]:not([disabled])') as HTMLElement;
        firstOption?.focus();
      }
    }
  };

  return (
    <div className={cn('relative inline-block', className)} ref={dropdownRef}>
      <Button
        ref={triggerRef}
        variant={variant}
        size={size}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2"
      >
        {trigger}
        <Icon size="sm" className={cn(isOpen && 'rotate-180', 'transition-transform duration-200')}>
          <path d="M19 9l-7 7-7-7" />
        </Icon>
      </Button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-dropdown min-w-[200px] max-w-xs bg-surface border border-border rounded-lg shadow-lg py-1',
            placementClasses[placement]
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors duration-200',
                'focus:bg-surface-variant focus:outline-none',
                option.disabled
                  ? 'text-text-disabled cursor-not-allowed'
                  : option.danger
                  ? 'text-error-600 hover:bg-error-50'
                  : 'text-text-primary hover:bg-surface-variant'
              )}
              onClick={() => handleOptionClick(option)}
              disabled={option.disabled}
              tabIndex={option.disabled ? -1 : 0}
            >
              {option.icon && (
                <span className="flex-shrink-0" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span className="flex-1">{option.label}</span>
            </button>
          ))}
          
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-muted">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
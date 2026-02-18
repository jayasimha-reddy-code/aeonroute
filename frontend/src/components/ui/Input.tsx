import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon: LeftIcon, rightIcon: RightIcon, onRightIconClick, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-label pointer-events-none">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-field',
              LeftIcon && 'pl-10',
              RightIcon && 'pr-10',
              error && 'input-error',
              className,
            )}
            {...props}
          />
          {RightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-label',
                onRightIconClick && 'cursor-pointer hover:text-white',
              )}
              onClick={onRightIconClick}
            >
              <RightIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-rose">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

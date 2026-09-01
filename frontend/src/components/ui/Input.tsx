import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`input ${hasError ? 'input-error' : ''} ${className}`.trim()}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

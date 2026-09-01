import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '14px',
          boxSizing: 'border-box',
          backgroundColor: props.disabled ? '#F3F4F6' : '#FFFFFF',
          color: props.disabled ? '#9CA3AF' : 'inherit',
          cursor: props.disabled ? 'not-allowed' : 'text',
          ...style,
        }}
        className={className}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

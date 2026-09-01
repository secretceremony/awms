import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, style, options, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          backgroundColor: '#FFFFFF',
          fontSize: '14px',
          color: '#1F2839',
          cursor: 'pointer',
          boxSizing: 'border-box',
          ...style,
        }}
        className={className}
        {...props}
      >
        {options ? options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) : children}
      </select>
    );
  }
);

Select.displayName = 'Select';

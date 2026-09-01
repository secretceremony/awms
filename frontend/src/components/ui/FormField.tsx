import React from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helperText,
  className = '',
  style,
  children,
}) => {
  return (
    <div className={`form-field ${className}`.trim()} style={style}>
      <label className="form-label">
        {label}
        {required && <span className="form-label-required">*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && <span className="form-helper">{helperText}</span>}
    </div>
  );
};

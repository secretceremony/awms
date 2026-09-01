import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const FormField: React.FC<FormFieldProps> = ({ label, required, children, style }) => {
  return (
    <div style={{ marginBottom: '16px', ...style }}>
      <label
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          color: '#4B5563',
          marginBottom: '6px',
        }}
      >
        {label} {required && '*'}
      </label>
      {children}
    </div>
  );
};

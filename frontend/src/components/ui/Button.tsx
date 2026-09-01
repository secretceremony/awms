import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, style, ...props }, ref) => {
    let baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.7 : 1,
      fontWeight: 500,
    };

    if (variant === 'primary') {
      baseStyle = {
        ...baseStyle,
        backgroundColor: 'var(--accent-blue, #2250A1)',
        color: '#FFFFFF',
        borderRadius: '6px',
        padding: size === 'sm' ? '4px 8px' : size === 'lg' ? '12px 24px' : '8px 16px',
        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
      };
    } else if (variant === 'secondary') {
      baseStyle = {
        ...baseStyle,
        backgroundColor: '#F3F4F6',
        color: '#374151',
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        padding: size === 'sm' ? '4px 8px' : size === 'lg' ? '12px 24px' : '8px 16px',
        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
      };
    } else if (variant === 'danger') {
      baseStyle = {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: 'var(--status-error, #EF4444)',
        padding: '4px',
      };
    } else if (variant === 'ghost') {
      baseStyle = {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: '#2250A1',
        padding: '4px',
      };
    } else if (variant === 'icon') {
      baseStyle = {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: '#4B5563',
        padding: '4px',
      };
    }

    return (
      <button ref={ref} style={{ ...baseStyle, ...style }} className={className} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

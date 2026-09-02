import React from 'react';

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  value: T | null;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  disabled = false,
  size = 'md',
  fullWidth = true,
}: SegmentedControlProps<T>) {
  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '4px 10px';
      case 'lg':
        return '10px 18px';
      default:
        return '7px 14px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return '0.8rem';
      case 'lg':
        return '0.95rem';
      default:
        return '0.875rem';
    }
  };

  return (
    <div
      style={{
        display: fullWidth ? 'grid' : 'inline-flex',
        gridTemplateColumns: fullWidth ? `repeat(${options.length}, 1fr)` : undefined,
        gap: '6px',
        backgroundColor: '#F3F4F6',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: getPadding(),
              fontSize: getFontSize(),
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? '#1E293B' : '#64748B',
              backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
              border: isSelected ? '1px solid #CBD5E1' : '1px solid transparent',
              borderRadius: '6px',
              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            {opt.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

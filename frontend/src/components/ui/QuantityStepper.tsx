import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (val: number) => void;
  unitSymbol?: string;
  size?: 'sm' | 'md';
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 1,
  max,
  step = 1,
  disabled = false,
  onChange,
  unitSymbol,
  size = 'md',
}) => {
  const handleDecrement = () => {
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = max !== undefined ? Math.min(max, value + step) : value + step;
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(min);
      return;
    }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    let clamped = Math.max(min, num);
    if (max !== undefined) clamped = Math.min(max, clamped);
    onChange(clamped);
  };

  const isSmall = size === 'sm';
  const btnSize = isSmall ? '24px' : '28px';
  const inputWidth = isSmall ? '48px' : '56px';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        title="Decrease quantity"
        style={{
          width: btnSize,
          height: btnSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          border: '1px solid #CBD5E1',
          backgroundColor: value <= min || disabled ? '#F1F5F9' : '#FFFFFF',
          color: value <= min || disabled ? '#94A3B8' : '#1E293B',
          cursor: value <= min || disabled ? 'not-allowed' : 'pointer',
          padding: 0,
          transition: 'all 0.15s ease',
        }}
      >
        <Minus size={isSmall ? 12 : 14} />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        style={{
          width: inputWidth,
          height: btnSize,
          textAlign: 'center',
          border: '1px solid #CBD5E1',
          borderRadius: '4px',
          fontSize: isSmall ? '0.8rem' : '0.85rem',
          fontWeight: 700,
          color: '#1E293B',
          padding: '0 2px',
          background: disabled ? '#F1F5F9' : '#FFFFFF',
        }}
      />

      <button
        type="button"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={handleIncrement}
        title="Increase quantity"
        style={{
          width: btnSize,
          height: btnSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          border: '1px solid #CBD5E1',
          backgroundColor: (max !== undefined && value >= max) || disabled ? '#F1F5F9' : '#FFFFFF',
          color: (max !== undefined && value >= max) || disabled ? '#94A3B8' : '#1E293B',
          cursor: (max !== undefined && value >= max) || disabled ? 'not-allowed' : 'pointer',
          padding: 0,
          transition: 'all 0.15s ease',
        }}
      >
        <Plus size={isSmall ? 12 : 14} />
      </button>

      {unitSymbol && (
        <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '3px' }}>
          {unitSymbol}
        </span>
      )}
    </div>
  );
};

export default QuantityStepper;

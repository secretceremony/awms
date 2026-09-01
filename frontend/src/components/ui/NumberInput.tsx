import React from 'react';
import { Input, type InputProps } from './Input.js';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value?: number | string;
  onChange?: (value: number) => void;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ onChange, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        onChange={(e) => {
          const val = e.target.value === '' ? 0 : Number(e.target.value);
          onChange?.(val);
        }}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';

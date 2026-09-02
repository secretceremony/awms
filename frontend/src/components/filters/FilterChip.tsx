import React from 'react';
import { X } from 'lucide-react';

export interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, value, onRemove }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        backgroundColor: '#F3F4F6',
        border: '1px solid #E5E7EB',
        borderRadius: '16px',
        fontSize: '0.75rem',
        color: '#374151',
        fontWeight: 500,
      }}
    >
      <span style={{ color: '#6B7280' }}>{label}:</span>
      <span style={{ fontWeight: 600, color: '#1F2839' }}>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          color: '#9CA3AF',
        }}
        title={`Remove ${label} filter`}
      >
        <X size={12} />
      </button>
    </div>
  );
};

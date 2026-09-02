import React from 'react';

export interface FilterPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '6px',
        marginBottom: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'flex-end',
      }}
    >
      {children}
    </div>
  );
};

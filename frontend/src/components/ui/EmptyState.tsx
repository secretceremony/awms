import React from 'react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  description,
  icon,
  action,
}) => {
  return (
    <div className="table-empty">
      {icon}
      <p style={{ fontWeight: 500 }}>{title}</p>
      {description && <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{description}</p>}
      {action}
    </div>
  );
};

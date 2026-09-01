import React from 'react';

interface StatusBadgeProps {
  status: boolean | string;
  activeText?: string;
  inactiveText?: string;
  type?: 'success-error' | 'default';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  activeText = 'Active', 
  inactiveText = 'Inactive',
  type = 'default',
  label: customLabel
}) => {
  let isActive = false;
  let label = '';
  
  if (typeof status === 'boolean') {
    isActive = status;
    label = customLabel || (isActive ? activeText : inactiveText);
  } else {
    isActive = status.toLowerCase() === 'active' || status.toLowerCase() === 'completed' || status.toLowerCase() === 'approved';
    label = customLabel || status;
  }

  // Assuming global CSS classes for badge-status exist
  // We can also use inline styles based on type
  if (type === 'default') {
    return (
      <span className={`badge-status ${isActive ? 'active' : 'inactive'}`}>
        {label}
      </span>
    );
  }

  return (
    <span 
      style={{
        padding: '4px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: isActive ? '#D1FAE5' : '#FEE2E2',
        color: isActive ? '#065F46' : '#991B1B',
      }}
    >
      {label}
    </span>
  );
};

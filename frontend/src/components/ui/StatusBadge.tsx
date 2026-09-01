import React from 'react';

export interface StatusBadgeProps {
  status: boolean | string;
  activeText?: string;
  inactiveText?: string;
  type?: 'status' | 'tracking' | 'condition';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  activeText = 'Active',
  inactiveText = 'Inactive',
  type = 'status',
  label: customLabel,
}) => {
  if (type === 'tracking') {
    const isSerialized = String(status).toUpperCase() === 'SERIALIZED';
    return (
      <span className={`badge-tracking ${isSerialized ? 'type-serialized' : 'type-bulk'}`}>
        {customLabel || (isSerialized ? 'Serialized' : 'Bulk')}
      </span>
    );
  }

  if (type === 'condition') {
    const val = String(status).toLowerCase();
    let conditionClass = 'good';
    if (val.includes('bad')) conditionClass = 'bad';
    else if (val.includes('repair')) conditionClass = 'repair';
    else if (val.includes('deploy')) conditionClass = 'deploy';

    return (
      <span className={`badge-condition ${conditionClass}`}>
        {customLabel || status}
      </span>
    );
  }

  let isActive = false;
  if (typeof status === 'boolean') {
    isActive = status;
  } else {
    const s = String(status).toLowerCase();
    isActive = s === 'active' || s === 'completed' || s === 'approved' || s === 'in_stock';
  }

  return (
    <span className={`badge-status ${isActive ? 'active' : 'inactive'}`}>
      {customLabel || (isActive ? activeText : inactiveText)}
    </span>
  );
};

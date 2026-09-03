import React from 'react';

export interface StatusBadgeProps {
  status: boolean | string;
  activeText?: string;
  inactiveText?: string;
  type?: 'status' | 'tracking' | 'material' | 'condition' | 'stockHealth' | 'orderStatus' | 'projectStatus';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  activeText = 'Active',
  inactiveText = 'Inactive',
  type,
  label: customLabel,
  size = 'md',
}) => {
  const str = String(status || '').trim();
  const lower = str.toLowerCase();

  // 1. Explicit or auto-detected tracking badge
  if (type === 'tracking' || lower === 'bulk' || lower === 'serialized') {
    const isSerialized = lower === 'serialized';
    return (
      <span
        className={`badge-pill ${isSerialized ? 'tracking-serialized' : 'tracking-bulk'} ${
          size === 'sm' ? 'badge-sm' : ''
        }`}
      >
        {customLabel || (isSerialized ? 'Serialized' : 'Bulk')}
      </span>
    );
  }

  // 2. Material Type Badge
  if (
    type === 'material' ||
    lower === 'main_material' ||
    lower === 'main material' ||
    lower === 'consumable' ||
    lower === 'tools' ||
    lower === 'hse_material' ||
    lower === 'hse material'
  ) {
    let matVariant: 'blue' | 'yellow' | 'purple' | 'green' | 'gray' = 'gray';
    let matLabel = customLabel || str;

    if (lower === 'main_material' || lower === 'main material') {
      matVariant = 'blue';
      matLabel = customLabel || 'Main Material';
    } else if (lower === 'consumable') {
      matVariant = 'yellow';
      matLabel = customLabel || 'Consumable';
    } else if (lower === 'tools') {
      matVariant = 'purple';
      matLabel = customLabel || 'Tools';
    } else if (lower === 'hse_material' || lower === 'hse material') {
      matVariant = 'green';
      matLabel = customLabel || 'HSE Material';
    } else {
      matVariant = 'gray';
      matLabel = customLabel || 'Uncategorized';
    }

    return (
      <span className={`badge-pill badge-${matVariant} ${size === 'sm' ? 'badge-sm' : ''}`}>
        {matLabel}
      </span>
    );
  }

  // 2. Semantic Color Mapping
  let colorVariant: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray' = 'gray';
  let displayLabel = customLabel || str;

  if (typeof status === 'boolean') {
    colorVariant = status ? 'green' : 'gray';
    displayLabel = status ? activeText : inactiveText;
  } else if (
    lower === 'active' ||
    lower === 'standby good' ||
    lower === 'standby_good' ||
    lower === 'normal' ||
    lower === 'in_stock' ||
    lower === 'in stock' ||
    lower === 'good' ||
    lower === 'incoming'
  ) {
    colorVariant = 'green';
    if (!customLabel) {
      if (lower.includes('standby')) displayLabel = 'Standby Good';
      else if (lower === 'normal') displayLabel = 'Normal Stock';
      else if (lower === 'incoming') displayLabel = 'Incoming';
      else displayLabel = 'Active';
    }
  } else if (lower === 'return') {
    // RETURN IS PURPLE / TEAL (DISTINCT FROM NORMAL INCOMING)
    colorVariant = 'purple';
    if (!customLabel) {
      displayLabel = 'Return';
    }
  } else if (
    lower === 'draft' ||
    lower === 'low stock' ||
    lower === 'low_stock' ||
    lower === 'warning' ||
    lower === 'pending' ||
    lower === 'adjustment'
  ) {
    colorVariant = 'yellow';
    if (!customLabel) {
      if (lower.includes('low')) displayLabel = 'Low Stock';
      else if (lower === 'draft') displayLabel = 'Draft';
      else if (lower === 'adjustment') displayLabel = 'Adjustment';
      else displayLabel = str;
    }
  } else if (
    lower === 'under repair' ||
    lower === 'under_repair' ||
    lower === 'repair' ||
    lower === 'standby bad' ||
    lower === 'standby_bad' ||
    lower === 'bad' ||
    lower === 'out of stock' ||
    lower === 'out_of_stock' ||
    lower === 'cancelled' ||
    lower === 'canceled'
  ) {
    colorVariant = 'red';
    if (!customLabel) {
      if (lower.includes('repair')) displayLabel = 'Under Repair';
      else if (lower.includes('bad')) displayLabel = 'Standby Bad';
      else if (lower.includes('out')) displayLabel = 'Out of Stock';
      else if (lower.includes('cancel')) displayLabel = 'Cancelled';
      else displayLabel = str;
    }
  } else if (
    lower === 'deploy' ||
    lower === 'deployed' ||
    lower === 'issued' ||
    lower === 'shipped' ||
    lower === 'delivered' ||
    lower === 'outgoing'
  ) {
    // DEPLOY & OUTGOING ARE BLUE
    colorVariant = 'blue';
    if (!customLabel) {
      if (lower === 'deploy' || lower === 'deployed') displayLabel = 'Deploy';
      else if (lower === 'issued') displayLabel = 'Issued';
      else if (lower === 'outgoing') displayLabel = 'Outgoing';
      else displayLabel = str;
    }
  } else if (
    lower === 'completed' ||
    lower === 'inactive' ||
    lower === 'closed' ||
    lower === 'archived' ||
    lower === 'initial'
  ) {
    // COMPLETED & INITIAL ARE NEUTRAL GRAY
    colorVariant = 'gray';
    if (!customLabel) {
      if (lower === 'initial') displayLabel = 'Initial';
      else if (lower === 'completed') displayLabel = 'Completed';
      else displayLabel = 'Inactive';
    }
  }

  return (
    <span className={`badge-pill badge-${colorVariant} ${size === 'sm' ? 'badge-sm' : ''}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;

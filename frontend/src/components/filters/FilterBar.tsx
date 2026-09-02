import React from 'react';
import { Input, Button } from '../ui/index.js';
import { Filter, RotateCcw } from 'lucide-react';
import { FilterChip } from './FilterChip.js';

export interface ActiveFilter {
  key: string;
  label: string;
  valueDisplay: string;
  onClear: () => void;
}

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  primaryFilter?: React.ReactNode;
  hasAdvancedFilters?: boolean;
  isAdvancedOpen?: boolean;
  onToggleAdvanced?: () => void;
  activeFilters?: ActiveFilter[];
  onResetAll?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  primaryFilter,
  hasAdvancedFilters = false,
  isAdvancedOpen = false,
  onToggleAdvanced,
  activeFilters = [],
  onResetAll,
}) => {
  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Primary visible row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        {primaryFilter && <div>{primaryFilter}</div>}

        {hasAdvancedFilters && onToggleAdvanced && (
          <Button
            variant={isAdvancedOpen ? 'primary' : 'secondary'}
            onClick={onToggleAdvanced}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Filter size={15} />
            <span>Filters</span>
          </Button>
        )}

        {activeFilters.length > 0 && onResetAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#EF4444' }}
          >
            <RotateCcw size={13} />
            <span>Reset Filters</span>
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#6B7280', marginRight: '2px' }}>Active filters:</span>
          {activeFilters.map((af) => (
            <FilterChip
              key={af.key}
              label={af.label}
              value={af.valueDisplay}
              onRemove={af.onClear}
            />
          ))}
        </div>
      )}
    </div>
  );
};

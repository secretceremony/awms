import React from 'react';
import { Select, SegmentedControl } from '../../ui/index.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../filters/index.js';

export interface WarehouseOption {
  id: number;
  name: string;
  cityCode?: string | null;
}

export interface StockFilterBarProps {
  search: string;
  trackingType: string;
  materialType: string;
  statusFilter: string;
  warehouseId: string;
  warehouses: WarehouseOption[];
  isAdvancedOpen: boolean;
  onToggleAdvanced: () => void;
  onUpdateFilters: (updates: Record<string, string | number | null>) => void;
  onResetAll: () => void;
  activeFilters: ActiveFilter[];
}

export const StockFilterBar: React.FC<StockFilterBarProps> = ({
  search,
  trackingType,
  materialType,
  statusFilter,
  warehouseId,
  warehouses,
  isAdvancedOpen,
  onToggleAdvanced,
  onUpdateFilters,
  onResetAll,
  activeFilters,
}) => {
  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={(val) => onUpdateFilters({ search: val })}
        searchPlaceholder="Search item name, brand, model, or scan SN..."
        primaryFilter={
          <div className="stock-primary-filter">
            <SegmentedControl
              options={[
                { value: 'all', label: 'All Inventory' },
                { value: 'bulk', label: 'Bulk Only' },
                { value: 'serialized', label: 'Serialized' },
              ]}
              value={trackingType}
              onChange={(val) => onUpdateFilters({ trackingType: val })}
            />
          </div>
        }
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={onToggleAdvanced}
        activeFilters={activeFilters}
        onResetAll={onResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
        <div className="stock-filter-field">
          <label className="stock-filter-label">
            Material Type
          </label>
          <Select
            value={materialType}
            onChange={(e) => onUpdateFilters({ materialType: e.target.value })}
          >
            <option value="all">All Types</option>
            <option value="MAIN_MATERIAL">Main Material</option>
            <option value="CONSUMABLE">Consumable</option>
            <option value="TOOLS">Tools</option>
            <option value="HSE_MATERIAL">HSE Material</option>
          </Select>
        </div>

        <div className="stock-filter-field">
          <label className="stock-filter-label">
            Stock Status
          </label>
          <Select
            value={statusFilter}
            onChange={(e) => onUpdateFilters({ status: e.target.value })}
          >
            <option value="all">All Statuses</option>
            <option value="Normal">Normal Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Deploy">Deploy (at Site)</option>
            <option value="In Warehouse">In Warehouse</option>
            <option value="Standby Good">Standby Good</option>
            <option value="Standby Bad">Standby Bad</option>
            <option value="Under Repair">Under Repair</option>
          </Select>
        </div>

        <div className="stock-filter-field field-wide">
          <label className="stock-filter-label">
            Warehouse Location
          </label>
          <Select
            value={warehouseId}
            onChange={(e) => onUpdateFilters({ warehouseId: e.target.value })}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.cityCode || w.name} ({w.name})
              </option>
            ))}
          </Select>
        </div>
      </FilterPanel>
    </>
  );
};

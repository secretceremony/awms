import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2, SlidersHorizontal } from 'lucide-react';
import { PaginatedTable, type Column } from '../../PaginatedTable.js';
import { Button, StatusBadge } from '../../ui/index.js';
import type { WarehouseOption } from './StockFilterBar.js';

export interface StockRow {
  id: string;
  itemId: number;
  warehouseId?: number | null;
  registeredDate: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT';
  itemName: string;
  materialType?: string | null;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string;
  trackingType: 'BULK' | 'SERIALIZED';
  quantity: number;
  unit: string;
  unitSymbol: string;
  condition: string;
  currentStatus: string;
  notes: string;
}

export interface StockTableProps {
  search: string;
  trackingType: string;
  materialType: string;
  warehouseId: string;
  statusFilter: string;
  refreshKey: number;
  warehouses: WarehouseOption[];
  canManage: boolean;
  onEditItem: (itemId: number) => void;
  onAdjustStock: (context: { itemId: number; warehouseId: number | null }) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  search,
  trackingType,
  materialType,
  warehouseId,
  statusFilter,
  refreshKey,
  warehouses,
  canManage,
  onEditItem,
  onAdjustStock,
}) => {
  const navigate = useNavigate();

  const columns: Column<StockRow>[] = [
    {
      header: 'Item & Model',
      key: 'itemName',
      render: (r) => (
        <div className="stock-item-cell">
          <div className="stock-item-title-row">
            <span
              className={`badge-pill ${
                r.trackingType === 'SERIALIZED' ? 'tracking-serialized' : 'tracking-bulk'
              } badge-sm`}
            >
              {r.trackingType === 'SERIALIZED' ? 'SERIAL' : 'BULK'}
            </span>
            <StatusBadge type="material" status={r.materialType || 'MAIN_MATERIAL'} size="sm" />
            <span className="stock-item-name">{r.itemName}</span>
          </div>
          {(r.brand || r.modelNumber) && (
            <div className="stock-item-subtitle">
              {r.brand && `${r.brand} `}
              {r.modelNumber && `[MN: ${r.modelNumber}]`}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Serial Number',
      key: 'serialNumber',
      render: (r) =>
        r.serialNumber && r.serialNumber !== '-' ? (
          <span className="stock-serial-badge">
            {r.serialNumber}
          </span>
        ) : (
          <span className="stock-serial-empty">—</span>
        ),
    },
    {
      header: 'Current Location',
      key: 'location',
      render: (r) => (
        <span className="stock-location-text">
          {r.location || '—'}
        </span>
      ),
    },
    {
      header: 'Available Qty',
      key: 'quantity',
      render: (r) => (
        <span className="stock-quantity-value">
          {r.quantity}{' '}
          <span className="stock-quantity-unit">
            {r.unitSymbol || r.unit || 'pcs'}
          </span>
        </span>
      ),
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (r) =>
        r.trackingType === 'SERIALIZED' && r.condition && r.condition !== '-' ? (
          <StatusBadge status={r.condition} size="sm" />
        ) : (
          <span className="stock-serial-empty">—</span>
        ),
    },
    {
      header: 'Stock Status',
      key: 'currentStatus',
      render: (r) => (
        <StatusBadge
          status={r.currentStatus}
          size="sm"
        />
      ),
    },
    {
      header: 'Registered',
      key: 'registeredDate',
      render: (r) => (
        <span className="stock-date-text">
          {new Date(r.registeredDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div className="stock-actions-cell">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inventory/item/${r.itemId}`);
            }}
            title="View Item Master Details"
            className="stock-action-button"
          >
            <Eye size={14} />
          </Button>

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditItem(r.itemId);
              }}
              title="Edit Item Master"
              className="stock-action-button"
            >
              <Edit2 size={14} />
            </Button>
          )}

          {canManage && r.locationType === 'WAREHOUSE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const wh = warehouses.find(
                  (w) => r.location.includes(w.name) || (w.cityCode && r.location.includes(w.cityCode)),
                );
                onAdjustStock({
                  itemId: r.itemId,
                  warehouseId: r.warehouseId || wh?.id || null,
                });
              }}
              title="Adjust Physical Balance / Condition"
              className="stock-action-button"
            >
              <SlidersHorizontal size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const exactMatchClassName = (r: StockRow) => {
    const trimmed = search.trim();
    if (trimmed && r.serialNumber && r.serialNumber.toLowerCase() === trimmed.toLowerCase()) {
      return 'row-exact-match';
    }
    return '';
  };

  return (
    <PaginatedTable<StockRow>
      fetchUrl="/stocks"
      searchPlaceholder="Search item, brand, MN, SN..."
      columns={columns}
      rowClassName={exactMatchClassName}
      onRowClick={(r) => navigate(`/inventory/item/${r.itemId}`)}
      emptyMessage="No stock records found matching current search and filters."
      extraParams={{
        trackingType: trackingType !== 'all' ? trackingType : undefined,
        materialType: materialType !== 'all' ? materialType : undefined,
        warehouseId: warehouseId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
        _refresh: refreshKey,
      }}
    />
  );
};

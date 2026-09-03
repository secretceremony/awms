import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, Input } from '../../components/ui/index.js';
import { MovementDetailModal } from '../../components/history/MovementDetailModal.js';
import { AdjustmentModal } from '../../components/history/AdjustmentModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';

interface StockMovement {
  id: number;
  movementNumber: string;
  movementType: 'INITIAL' | 'INCOMING' | 'OUTGOING' | 'RETURN' | 'ADJUSTMENT';
  movementDate: string;
  referenceNumber: string | null;
  notes: string | null;
  destinationWarehouse?: {
    id: number;
    name: string;
    cityCode?: string | null;
  };
  sourceWarehouse?: {
    id: number;
    name: string;
    cityCode?: string | null;
  };
  project?: {
    id: number;
    name: string;
    siteCode?: string | null;
  };
  createdBy?: {
    name: string;
  };
  items: Array<{
    id: number;
    quantity: number;
    item: {
      id: number;
      name: string;
      brand: string | null;
      modelNumber: string | null;
      trackingType: 'BULK' | 'SERIALIZED';
      unit?: { name: string; symbol: string | null };
    };
    movementSerials?: Array<{
      id: number;
      itemSerial: {
        id: number;
        serialNumber: string;
        state: string;
        conditionLabel: string | null;
        notes: string | null;
      };
    }>;
  }>;
}

export const MovementHistory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const typeFilter = searchParams.get('type') || 'all';
  const warehouseFilter = searchParams.get('warehouseId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; cityCode?: string | null }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res: any = await apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } });
        setWarehouses(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    fetchWarehouses();
  }, []);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    if (!('page' in updates)) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeFilters: ActiveFilter[] = [];
  if (typeFilter && typeFilter !== 'all') {
    activeFilters.push({
      key: 'type',
      label: 'Type',
      valueDisplay: typeFilter,
      onClear: () => updateFilters({ type: null }),
    });
  }
  if (warehouseFilter) {
    const matchedWh = warehouses.find((w) => String(w.id) === warehouseFilter);
    activeFilters.push({
      key: 'warehouseId',
      label: 'Warehouse',
      valueDisplay: matchedWh ? (matchedWh.cityCode || matchedWh.name) : `WH #${warehouseFilter}`,
      onClear: () => updateFilters({ warehouseId: null }),
    });
  }
  if (dateFrom) {
    activeFilters.push({
      key: 'dateFrom',
      label: 'From',
      valueDisplay: dateFrom,
      onClear: () => updateFilters({ dateFrom: null }),
    });
  }
  if (dateTo) {
    activeFilters.push({
      key: 'dateTo',
      label: 'To',
      valueDisplay: dateTo,
      onClear: () => updateFilters({ dateTo: null }),
    });
  }

  const columns: Column<StockMovement>[] = [
    {
      header: 'Movement Date',
      key: 'movementDate',
      render: (m) => (
        <span style={{ fontSize: '0.8rem', color: '#4B5563', whiteSpace: 'nowrap' }}>
          {new Date(m.movementDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Type',
      key: 'movementType',
      render: (m) => (
        <StatusBadge type="condition" status={m.movementType} label={m.movementType} />
      ),
    },
    {
      header: 'Source',
      key: 'source',
      render: (m) => {
        if (m.sourceWarehouse) {
          return (
            <span style={{ fontWeight: 600, color: '#1F2839' }}>
              {m.sourceWarehouse.cityCode || m.sourceWarehouse.name}
            </span>
          );
        }
        if (m.project && m.movementType === 'RETURN') {
          return <span style={{ color: '#0891B2', fontWeight: 600 }}>{m.project.siteCode || m.project.name}</span>;
        }
        return <span style={{ color: '#9CA3AF' }}>-</span>;
      },
    },
    {
      header: 'Destination',
      key: 'destination',
      render: (m) => {
        if (m.destinationWarehouse) {
          return (
            <span style={{ fontWeight: 600, color: '#1F2839' }}>
              {m.destinationWarehouse.cityCode || m.destinationWarehouse.name}
            </span>
          );
        }
        if (m.project && m.movementType === 'OUTGOING') {
          return <span style={{ color: '#0891B2', fontWeight: 600 }}>{m.project.siteCode || m.project.name}</span>;
        }
        return <span style={{ color: '#9CA3AF' }}>-</span>;
      },
    },
    {
      header: 'Item',
      key: 'items',
      render: (m) => {
        const firstItem = m.items[0]?.item;
        if (!firstItem) return '-';
        return (
          <div>
            <span style={{ fontWeight: 600, color: '#1F2839' }}>{firstItem.name}</span>
            {m.items.length > 1 && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  backgroundColor: '#EFF6FF',
                  color: '#2250A1',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                +{m.items.length - 1} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (m) => {
        const totalQty = m.items.reduce((acc, curr) => acc + curr.quantity, 0);
        const unit = m.items[0]?.item?.unit;
        return (
          <span style={{ fontWeight: 600 }}>
            {totalQty} {unit?.symbol || unit?.name || 'pcs'}
          </span>
        );
      },
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (m) => (
        <span style={{ fontSize: '13px', color: '#4B5563' }}>
          {m.createdBy?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (m) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedMovementId(m.id)}
          title="View Movement Details"
        >
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Movement History"
        description="Audit ledger of all stock transactions including receipts, allocations, returns, and adjustments"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              disabled
              title="Excel/PDF table export is coming soon"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.6, cursor: 'not-allowed' }}
            >
              Export (Coming Soon)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsAdjustmentModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Adjust Stock
            </Button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search movement number, reference, item name, notes..."
        primaryFilter={
          <div style={{ width: '180px' }}>
            <Select
              value={typeFilter}
              onChange={(e) => updateFilters({ type: e.target.value })}
            >
              <option value="all">All Movement Types</option>
              <option value="INITIAL">Initial Stock</option>
              <option value="INCOMING">Incoming</option>
              <option value="OUTGOING">Outgoing</option>
              <option value="RETURN">Return</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </Select>
          </div>
        }
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
        <div style={{ width: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Warehouse Location
          </label>
          <Select
            value={warehouseFilter}
            onChange={(e) => updateFilters({ warehouseId: e.target.value })}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.cityCode || w.name} ({w.name})
              </option>
            ))}
          </Select>
        </div>

        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            From Date
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
          />
        </div>

        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            To Date
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
          />
        </div>
      </FilterPanel>

      <PaginatedTable<StockMovement>
        fetchUrl="/stock-movements"
        searchPlaceholder="Search movement history..."
        columns={columns}
        extraParams={{
          movementType: typeFilter !== 'all' ? typeFilter : undefined,
          warehouseId: warehouseFilter ? Number(warehouseFilter) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
          _refresh: refreshKey,
        }}
      />

      <MovementDetailModal
        isOpen={selectedMovementId !== null}
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />

      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
};

export default MovementHistory;

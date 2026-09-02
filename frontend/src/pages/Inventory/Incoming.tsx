import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus } from 'lucide-react';
import { Button, PageHeader, Select, Input } from '../../components/ui/index.js';
import { AddIncomingModal } from '../../components/inventory/AddIncomingModal.js';
import { IncomingDetailModal } from '../../components/inventory/IncomingDetailModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';

interface StockMovement {
  id: number;
  movementNumber: string;
  movementDate: string;
  referenceNumber: string | null;
  notes: string | null;
  destinationWarehouse?: {
    id: number;
    name: string;
    cityCode?: string | null;
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

export const Incoming: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const warehouseId = searchParams.get('warehouseId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; cityCode?: string | null }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res: any = await apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } });
        setWarehouses(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load warehouses for filter:', err);
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
  if (warehouseId) {
    const matchedWh = warehouses.find((w) => String(w.id) === warehouseId);
    activeFilters.push({
      key: 'warehouseId',
      label: 'Warehouse',
      valueDisplay: matchedWh ? (matchedWh.cityCode || matchedWh.name) : `WH #${warehouseId}`,
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
        <span style={{ fontSize: '13px', color: '#4B5563', whiteSpace: 'nowrap' }}>
          {new Date(m.movementDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Warehouse',
      key: 'destinationWarehouse',
      render: (m) => (
        <span style={{ fontWeight: 600, color: '#1F2839' }}>
          {m.destinationWarehouse?.cityCode || m.destinationWarehouse?.name || '-'}
        </span>
      ),
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
      header: 'Brand',
      key: 'brand',
      render: (m) => m.items[0]?.item.brand || '-',
    },
    {
      header: 'MN',
      key: 'modelNumber',
      render: (m) => m.items[0]?.item.modelNumber || '-',
    },
    {
      header: 'SN',
      key: 'serialNumber',
      render: (m) => {
        const firstItem = m.items[0];
        if (!firstItem || firstItem.item.trackingType !== 'SERIALIZED') return '-';
        const serials = firstItem.movementSerials || [];
        if (serials.length === 0) return '-';
        if (serials.length === 1) {
          return (
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
              {serials[0].itemSerial.serialNumber}
            </span>
          );
        }
        return (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
            {serials[0].itemSerial.serialNumber} (+{serials.length - 1})
          </span>
        );
      },
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (m) => {
        const totalQty = m.items.reduce((acc, curr) => acc + curr.quantity, 0);
        return <span style={{ fontWeight: 600 }}>{totalQty}</span>;
      },
    },
    {
      header: 'Unit',
      key: 'unit',
      render: (m) => {
        const firstItem = m.items[0]?.item;
        return firstItem?.unit?.symbol || firstItem?.unit?.name || 'pcs';
      },
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (m) => {
        const firstItem = m.items[0];
        if (!firstItem || firstItem.item.trackingType !== 'SERIALIZED') return '-';
        const serials = firstItem.movementSerials || [];
        return serials[0]?.itemSerial.conditionLabel || 'Standby Good';
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
      header: 'Note',
      key: 'notes',
      render: (m) => (
        <span
          style={{
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            fontSize: '12px',
            color: '#6B7280',
          }}
          title={m.notes || ''}
        >
          {m.notes || '-'}
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
          title="View Incoming Details"
        >
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Incoming Stock"
        description="Receive, register, and log new warehouse inventory and equipment"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Incoming
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search reference no, item name, brand, MN, SN, notes..."
        primaryFilter={
          <div style={{ width: '180px' }}>
            <Select
              value={warehouseId}
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
        }
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
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
        fetchUrl="/stock-movements/incoming"
        searchPlaceholder="Search incoming movements..."
        columns={columns}
        extraParams={{
          warehouseId: warehouseId ? Number(warehouseId) : undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          search: search || undefined,
          _refresh: refreshKey,
        }}
      />

      <AddIncomingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <IncomingDetailModal
        isOpen={selectedMovementId !== null}
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />
    </div>
  );
};

export default Incoming;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, Layers, Edit2, SlidersHorizontal, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button, PageHeader, Select } from '../../components/ui/index.js';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';
import { InitialStockModal } from '../../components/inventory/InitialStockModal.js';
import { AdjustmentModal } from '../../components/history/AdjustmentModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';

interface StockRow {
  id: string;
  itemId: number;
  warehouseId?: number | null;
  registeredDate: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT';
  itemName: string;
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

export const StockList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const trackingType = searchParams.get('trackingType') || 'all';
  const warehouseId = searchParams.get('warehouseId') || '';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; cityCode?: string | null }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustContext, setAdjustContext] = useState<{ itemId: number | null; warehouseId: number | null }>({
    itemId: null,
    warehouseId: null,
  });

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
  if (trackingType && trackingType !== 'all') {
    activeFilters.push({
      key: 'trackingType',
      label: 'Tracking',
      valueDisplay: trackingType.toUpperCase(),
      onClear: () => updateFilters({ trackingType: null }),
    });
  }
  if (warehouseId) {
    const matchedWh = warehouses.find((w) => String(w.id) === warehouseId);
    activeFilters.push({
      key: 'warehouseId',
      label: 'Warehouse',
      valueDisplay: matchedWh ? (matchedWh.cityCode || matchedWh.name) : `WH #${warehouseId}`,
      onClear: () => updateFilters({ warehouseId: null }),
    });
  }

  const handleEditItem = async (itemId: number) => {
    try {
      const res: any = await apiClient.get(`/items/${itemId}`);
      const itemData = res?.data || res;
      setEditingItem(itemData);
      setIsItemModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch item for edit:', err);
    }
  };

  const renderStatusBadge = (status: string, _tracking: string, qty: number) => {
    const s = (status || '').toLowerCase();

    if (s === 'out of stock' || qty === 0) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 700, fontSize: '0.75rem' }}>
          <AlertCircle size={12} /> Out of Stock
        </span>
      );
    }

    if (s === 'low stock') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '0.75rem' }}>
          <AlertTriangle size={12} /> Low Stock
        </span>
      );
    }

    if (s === 'deploy' || s === 'deployed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#0891B2', fontWeight: 700, fontSize: '0.75rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
          Deploy
        </span>
      );
    }

    if (s.includes('repair')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '0.75rem' }}>
          Under Repair
        </span>
      );
    }

    if (s.includes('bad')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '0.75rem' }}>
          Standby Bad
        </span>
      );
    }

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#D1FAE5', color: '#047857', fontWeight: 700, fontSize: '0.75rem' }}>
        <CheckCircle2 size={12} /> {status === 'Normal' ? 'Normal' : status || 'In Warehouse'}
      </span>
    );
  };

  const columns: Column<StockRow>[] = [
    {
      header: 'Registered Date',
      key: 'registeredDate',
      render: (r) => (
        <span style={{ fontSize: '13px', color: '#4B5563', whiteSpace: 'nowrap' }}>
          {new Date(r.registeredDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Location',
      key: 'location',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#1F2839', whiteSpace: 'nowrap' }}>
          {r.location}
        </span>
      ),
    },
    {
      header: 'Item',
      key: 'itemName',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#1F2839' }}>{r.itemName}</span>
      ),
    },
    {
      header: 'Brand',
      key: 'brand',
      render: (r) => r.brand || '-',
    },
    {
      header: 'MN',
      key: 'modelNumber',
      render: (r) => r.modelNumber || '-',
    },
    {
      header: 'SN',
      key: 'serialNumber',
      render: (r) =>
        r.serialNumber !== '-' ? (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
            {r.serialNumber}
          </span>
        ) : (
          <span style={{ color: '#9CA3AF' }}>-</span>
        ),
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.quantity}</span>,
    },
    {
      header: 'Unit',
      key: 'unit',
      render: (r) => r.unitSymbol || r.unit || 'pcs',
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (r) => (
        <span style={{ fontSize: '13px', color: '#4B5563' }}>{r.condition || '-'}</span>
      ),
    },
    {
      header: 'Current Status',
      key: 'currentStatus',
      render: (r) => renderStatusBadge(r.currentStatus, r.trackingType, r.quantity),
    },
    {
      header: 'Note',
      key: 'notes',
      render: (r) => (
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
          title={r.notes !== '-' ? r.notes : ''}
        >
          {r.notes || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/inventory/item/${r.itemId}`)}
            title="View Item Details"
          >
            <Eye size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditItem(r.itemId)}
            title="Edit Item Master"
          >
            <Edit2 size={15} />
          </Button>
          {r.locationType === 'WAREHOUSE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const wh = warehouses.find((w) => r.location.includes(w.name) || (w.cityCode && r.location.includes(w.cityCode)));
                setAdjustContext({
                  itemId: r.itemId,
                  warehouseId: r.warehouseId || wh?.id || null,
                });
                setIsAdjustModalOpen(true);
              }}
              title="Adjust Stock / Condition"
            >
              <SlidersHorizontal size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Stock List"
        description="Real-time inventory levels, serialized asset tracking, and warehouse allocations"
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
              onClick={() => setIsInitialStockModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={16} /> Initial Stock
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Create Item Master
            </Button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search item name, brand, MN, SN..."
        primaryFilter={
          <div style={{ width: '160px' }}>
            <Select
              value={trackingType}
              onChange={(e) => updateFilters({ trackingType: e.target.value })}
            >
              <option value="all">All Tracking</option>
              <option value="bulk">Bulk Only</option>
              <option value="serialized">Serialized Only</option>
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
        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Warehouse Location
          </label>
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
      </FilterPanel>

      <PaginatedTable<StockRow>
        fetchUrl="/stocks"
        searchPlaceholder="Search item, brand, MN, SN..."
        columns={columns}
        extraParams={{
          trackingType: trackingType !== 'all' ? trackingType : undefined,
          warehouseId: warehouseId || undefined,
          search: search || undefined,
          _refresh: refreshKey,
        }}
      />

      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={editingItem}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <InitialStockModal
        isOpen={isInitialStockModalOpen}
        onClose={() => setIsInitialStockModalOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <AdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustContext({ itemId: null, warehouseId: null });
        }}
        initialItemId={adjustContext.itemId}
        initialWarehouseId={adjustContext.warehouseId}
        lockContext={Boolean(adjustContext.itemId)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
};

export default StockList;

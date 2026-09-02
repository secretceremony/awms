import { useState, useEffect } from 'react';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, SlidersHorizontal } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, Input } from '../../components/ui/index.js';
import { MovementDetailModal } from '../../components/history/MovementDetailModal.js';
import { AdjustmentModal } from '../../components/history/AdjustmentModal.js';

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

export const MovementHistory = () => {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
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
      header: 'Type',
      key: 'movementType',
      render: (m) => (
        <StatusBadge type="condition" status={m.movementType} label={m.movementType} />
      ),
    },
    {
      header: 'Warehouse',
      key: 'destinationWarehouse',
      render: (m) => {
        const wh = m.destinationWarehouse || m.sourceWarehouse;
        return (
          <span style={{ fontWeight: 600, color: '#1F2839' }}>
            {wh?.cityCode || wh?.name || '-'}
          </span>
        );
      },
    },
    {
      header: 'Project',
      key: 'project',
      render: (m) => (
        <span style={{ fontSize: '13px', color: '#4B5563' }}>
          {m.project?.name || '-'}
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
              <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>
                +{m.items.length - 1} other item(s)
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Brand',
      key: 'brand',
      render: (m) => m.items[0]?.item?.brand || '-',
    },
    {
      header: 'MN',
      key: 'modelNumber',
      render: (m) =>
        m.items[0]?.item?.modelNumber ? (
          <code>{m.items[0]?.item?.modelNumber}</code>
        ) : (
          '-'
        ),
    },
    {
      header: 'SN',
      key: 'serialNumber',
      render: (m) => {
        const serials = m.items.flatMap((i) => i.movementSerials || []);
        if (serials.length === 0) return '-';

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '180px' }}>
            {serials.slice(0, 2).map((s, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#F3F4F6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  fontFamily: 'monospace',
                }}
              >
                {s.itemSerial?.serialNumber}
              </span>
            ))}
            {serials.length > 2 && (
              <span style={{ fontSize: '11px', color: '#6B7280', alignSelf: 'center' }}>
                +{serials.length - 2} more
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
        return <span style={{ fontWeight: 600 }}>{totalQty}</span>;
      },
    },
    {
      header: 'Unit',
      key: 'unit',
      render: (m) => m.items[0]?.item?.unit?.symbol || m.items[0]?.item?.unit?.name || '-',
    },
    {
      header: 'Reference / DO',
      key: 'referenceNumber',
      render: (m) => (
        <span style={{ fontSize: '12px', color: '#4B5563' }}>
          {m.referenceNumber || '-'}
        </span>
      ),
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
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn-icon"
            onClick={() => setSelectedMovementId(m.id)}
            title="View Movement Detail"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Stock Movement History"
        description="Immutable audit ledger tracking all inventory transactions, dispatches, and adjustments."
        actions={
          <Button variant="primary" onClick={() => setIsAdjustmentModalOpen(true)}>
            <Plus size={16} /> Add Adjustment
          </Button>
        }
      />

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--border-radius)',
          padding: '12px 16px',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '13px' }}>
          <SlidersHorizontal size={14} /> Filters:
        </div>

        <Select
          style={{ width: '160px', height: '36px', fontSize: '13px' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Movement Types</option>
          <option value="INITIAL">INITIAL</option>
          <option value="INCOMING">INCOMING</option>
          <option value="OUTGOING">OUTGOING</option>
          <option value="RETURN">RETURN</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
        </Select>

        <Select
          style={{ width: '170px', height: '36px', fontSize: '13px' }}
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.cityCode ? `(${w.cityCode})` : ''}
            </option>
          ))}
        </Select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>From:</span>
          <Input
            type="date"
            style={{ width: '140px', height: '36px', fontSize: '12px' }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>To:</span>
          <Input
            type="date"
            style={{ width: '140px', height: '36px', fontSize: '12px' }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {(typeFilter || warehouseFilter || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter('');
              setWarehouseFilter('');
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <PaginatedTable<StockMovement>
        key={`movements-${typeFilter}-${warehouseFilter}-${dateFrom}-${dateTo}-${refreshKey}`}
        fetchUrl="/stock-movements"
        searchPlaceholder="Search by item, brand, MN, SN, reference, or remarks..."
        extraParams={{
          movementType: typeFilter || undefined,
          warehouseId: warehouseFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }}
        columns={columns}
      />

      {/* Movement Detail Modal */}
      <MovementDetailModal
        isOpen={selectedMovementId !== null}
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default MovementHistory;

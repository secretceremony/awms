import { useState, useEffect } from 'react';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select } from '../../components/ui/index.js';
import { AddIncomingModal } from '../../components/inventory/AddIncomingModal.js';
import { IncomingDetailModal } from '../../components/inventory/IncomingDetailModal.js';

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

export const Incoming = () => {
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
            {serials.slice(0, 3).map((s, idx) => (
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
            {serials.length > 3 && (
              <span style={{ fontSize: '11px', color: '#6B7280', alignSelf: 'center' }}>
                +{serials.length - 3} more
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
      header: 'Condition',
      key: 'condition',
      render: (m) => {
        const serials = m.items.flatMap((i) => i.movementSerials || []);
        if (serials.length > 0) {
          const firstCond = serials[0]?.itemSerial?.conditionLabel || serials[0]?.itemSerial?.state || 'Standby Good';
          return <StatusBadge type="condition" status={firstCond} />;
        }
        return '-';
      },
    },
    {
      header: 'Reference',
      key: 'referenceNumber',
      render: (m) => (
        <span style={{ fontSize: '13px', color: '#4B5563' }}>
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
            title="View Incoming Receipt Details"
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
        title="Incoming Stock Receipts"
        description="Transaction history of goods received into warehouse locations."
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              style={{ width: '170px' }}
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

            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} /> Record Incoming
            </Button>
          </div>
        }
      />

      <PaginatedTable<StockMovement>
        key={`incoming-${warehouseFilter}-${refreshKey}`}
        fetchUrl="/stock-movements/incoming"
        searchPlaceholder="Search by item, brand, MN, SN, or reference number..."
        extraParams={{
          warehouseId: warehouseFilter || undefined,
        }}
        columns={columns}
      />

      {/* Add Incoming Modal */}
      <AddIncomingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Incoming Detail Modal */}
      <IncomingDetailModal
        isOpen={selectedMovementId !== null}
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />
    </div>
  );
};

export default Incoming;

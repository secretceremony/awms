import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, Layers } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select } from '../../components/ui/index.js';
import { ItemFormModal } from '../../components/inventory/ItemFormModal.js';
import { InitialStockModal } from '../../components/inventory/InitialStockModal.js';

interface StockRow {
  id: string;
  itemId: number;
  date: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT';
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  serialNumbers?: string[];
  quantity: number;
  unit: string;
  unitSymbol: string | null;
  condition?: string | null;
  state?: string | null;
}

export const StockList = () => {
  const navigate = useNavigate();
  const [trackingFilter, setTrackingFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res: any = await apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } });
        if (res && res.data) {
          setWarehouses(res.data);
        }
      } catch (err) {
        console.error('Failed to load warehouses for filter:', err);
      }
    };
    fetchWarehouses();
  }, []);

  const columns: Column<StockRow>[] = [
    {
      header: 'Date',
      key: 'date',
      render: (r) => (
        <span style={{ fontSize: '13px', color: '#4B5563' }}>
          {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
        </span>
      ),
    },
    {
      header: 'Location',
      key: 'location',
      render: (r) => (
        <span style={{ fontWeight: 500, color: '#1F2839' }}>
          {r.location}
        </span>
      ),
    },
    {
      header: 'Item',
      key: 'itemName',
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{r.itemName}</span>
        </div>
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
      render: (r) => (r.modelNumber ? <code>{r.modelNumber}</code> : '-'),
    },
    {
      header: 'SN',
      key: 'serialNumbers',
      render: (r) => {
        if (r.trackingType !== 'SERIALIZED' || !r.serialNumbers || r.serialNumbers.length === 0) {
          return '-';
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '260px' }}>
            {r.serialNumbers.map((sn, idx) => (
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
                {sn}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (r) => (
        <span style={{ fontWeight: 600 }}>{r.quantity}</span>
      ),
    },
    {
      header: 'Unit',
      key: 'unit',
      render: (r) => r.unitSymbol || r.unit || '-',
    },
    {
      header: 'Tracking',
      key: 'trackingType',
      render: (r) => <StatusBadge type="tracking" status={r.trackingType} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => navigate(`/inventory/item/${r.itemId}`)}
            title="View Item Master & History"
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
        title="Inventory Stock List"
        description="Real-time physical inventory balances and serialized asset locations."
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              style={{ width: '150px' }}
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
            >
              <option value="all">All Tracking</option>
              <option value="BULK">Bulk Only</option>
              <option value="SERIALIZED">Serialized Only</option>
            </Select>

            <Select
              style={{ width: '170px' }}
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <Button variant="secondary" onClick={() => setIsInitialStockModalOpen(true)}>
              <Layers size={16} /> Initial Stock
            </Button>

            <Button variant="primary" onClick={() => setIsItemModalOpen(true)}>
              <Plus size={16} /> Add Item
            </Button>
          </div>
        }
      />

      <PaginatedTable<StockRow>
        key={`stocks-${trackingFilter}-${warehouseFilter}-${refreshKey}`}
        fetchUrl="/stocks"
        searchPlaceholder="Search by item, brand, MN, or serial number..."
        extraParams={{
          trackingType: trackingFilter !== 'all' ? trackingFilter : undefined,
          warehouseId: warehouseFilter || undefined,
        }}
        columns={columns}
      />

      {/* Item Form Modal */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Initial Stock Modal */}
      <InitialStockModal
        isOpen={isInitialStockModalOpen}
        onClose={() => setIsInitialStockModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default StockList;

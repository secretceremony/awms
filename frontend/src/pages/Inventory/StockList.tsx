import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, Layers, Edit2 } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select } from '../../components/ui/index.js';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';
import { InitialStockModal } from '../../components/inventory/InitialStockModal.js';

interface StockRow {
  id: string;
  itemId: number;
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

export const StockList = () => {
  const navigate = useNavigate();
  const [trackingFilter, setTrackingFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; cityCode?: string | null }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

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
      render: (r) => (r.modelNumber ? <code>{r.modelNumber}</code> : '-'),
    },
    {
      header: 'SN',
      key: 'serialNumber',
      render: (r) =>
        r.serialNumber !== '-' ? (
          <code
            style={{
              backgroundColor: '#F3F4F6',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #E5E7EB',
              fontSize: '12px',
            }}
          >
            {r.serialNumber}
          </code>
        ) : (
          '-'
        ),
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.quantity}</span>,
    },
    {
      header: 'Unit',
      key: 'unitSymbol',
      render: (r) => r.unitSymbol || r.unit || '-',
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (r) => (
        r.condition !== '-' ? (
          <StatusBadge type="condition" status={r.condition} />
        ) : (
          '-'
        )
      ),
    },
    {
      header: 'Current Status',
      key: 'currentStatus',
      render: (r) => {
        let badgeVariant: 'active' | 'inactive' | 'pending' = 'active';
        if (r.currentStatus === 'Deploy') badgeVariant = 'pending';
        else if (r.currentStatus === 'Under Repair' || r.currentStatus === 'Standby Bad') badgeVariant = 'inactive';

        return (
          <span className={`badge-status badge-${badgeVariant}`}>
            {r.currentStatus}
          </span>
        );
      },
    },
    {
      header: 'Note',
      key: 'notes',
      render: (r) => (
        <span style={{ fontSize: '12px', color: '#6B7280', maxWidth: '150px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.notes || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn-icon"
            onClick={() => navigate(`/inventory/item/${r.itemId}`)}
            title="View Current Inventory Detail"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => handleEditItem(r.itemId)}
            title="Edit Master Item"
          >
            <Edit2 size={16} />
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
                  {w.name} {w.cityCode ? `(${w.cityCode})` : ''}
                </option>
              ))}
            </Select>

            <Button variant="secondary" onClick={() => setIsInitialStockModalOpen(true)}>
              <Layers size={16} /> Initial Stock
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
            >
              <Plus size={16} /> Add Item
            </Button>
          </div>
        }
      />

      <PaginatedTable<StockRow>
        key={`stocks-${trackingFilter}-${warehouseFilter}-${refreshKey}`}
        fetchUrl="/stocks"
        searchPlaceholder="Search by item, brand, MN, SN, location, status..."
        extraParams={{
          trackingType: trackingFilter !== 'all' ? trackingFilter : undefined,
          warehouseId: warehouseFilter || undefined,
        }}
        columns={columns}
      />

      {/* Item Form Modal (Create / Edit) */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        item={editingItem}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
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

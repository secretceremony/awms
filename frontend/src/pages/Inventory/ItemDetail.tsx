import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { PageHeader, Button, Card, StatusBadge } from '../../components/ui/index.js';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';

interface ItemSerial {
  id: number;
  serialNumber: string;
  state: string;
  conditionLabel: string | null;
  currentWarehouse?: { id: number; name: string };
  currentProject?: { id: number; name: string };
}

export const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchItem = async () => {
    try {
      const res: any = await apiClient.get(`/items/${id}`);
      setItem(res?.data || res);
    } catch (err) {
      console.error('Failed to load item detail:', err);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id, refreshKey]);

  if (!item) {
    return (
      <div className="page-container">
        <div className="table-loading">
          <p>Loading item details...</p>
        </div>
      </div>
    );
  }

  const serialColumns: Column<ItemSerial>[] = [
    { header: 'Serial Number', key: 'serialNumber', render: (s) => <code>{s.serialNumber}</code> },
    {
      header: 'State / Condition',
      key: 'state',
      render: (s) => (
        <StatusBadge type="condition" status={s.state} label={`${s.state}${s.conditionLabel ? ` (${s.conditionLabel})` : ''}`} />
      ),
    },
    {
      header: 'Current Warehouse',
      key: 'currentWarehouse',
      render: (s) => s.currentWarehouse?.name || '-',
    },
    {
      header: 'Current Project',
      key: 'currentProject',
      render: (s) => s.currentProject?.name || '-',
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft size={16} /> Back to Master Inventory
        </Button>
      </div>

      <PageHeader
        title={item.name}
        description={`Brand: ${item.brand || 'N/A'} • Tracking: ${item.trackingType} • Unit: ${item.unit?.name || 'N/A'}`}
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <StatusBadge status={item.isActive} />
            <Button variant="primary" size="sm" onClick={() => setIsEditModalOpen(true)}>
              <Edit2 size={14} /> Edit Item
            </Button>
          </div>
        }
      />

      <Card title="Item Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Brand</span>
            <p style={{ fontWeight: 600 }}>{item.brand || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Tracking Type</span>
            <div><StatusBadge type="tracking" status={item.trackingType} /></div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Unit of Measure</span>
            <p style={{ fontWeight: 600 }}>{item.unit?.name || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Status</span>
            <div><StatusBadge status={item.isActive} /></div>
          </div>
        </div>
      </Card>

      {item.trackingType === 'SERIALIZED' && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2839', marginBottom: '16px' }}>
            Tracked Serial Numbers
          </h3>
          <PaginatedTable<ItemSerial>
            key={`item-serials-${item.id}-${refreshKey}`}
            fetchUrl={`/items/${item.id}/serials`}
            searchPlaceholder="Search serial numbers..."
            columns={serialColumns}
          />
        </div>
      )}

      {/* Edit Item Modal */}
      <ItemFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={item}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default ItemDetail;

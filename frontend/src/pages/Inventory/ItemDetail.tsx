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
  notes: string | null;
  currentWarehouse?: { id: number; name: string; cityCode?: string | null };
  currentProject?: { id: number; name: string; location?: string | null };
}

interface WarehouseStockBalance {
  id: number;
  warehouseId: number;
  quantity: number;
  warehouse: { id: number; name: string; cityCode?: string | null; location: string };
}

export const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [balances, setBalances] = useState<WarehouseStockBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchItemData = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [itemRes, balancesRes]: any = await Promise.all([
        apiClient.get(`/items/${id}`),
        apiClient.get(`/items/${id}/balances`),
      ]);
      setItem(itemRes?.data || itemRes);
      setBalances(Array.isArray(balancesRes) ? balancesRes : balancesRes?.data || []);
    } catch (err: any) {
      console.error('Failed to load item:', err);
      setErrorMsg(err.message || 'Failed to load item details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItemData();
  }, [id, refreshKey]);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="table-loading">
          <p>Loading item details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !item) {
    return (
      <div className="page-container">
        <p style={{ color: 'red' }}>{errorMsg || 'Item not found'}</p>
        <Button onClick={() => navigate('/inventory')}>Back to Stock List</Button>
      </div>
    );
  }

  const serialColumns: Column<ItemSerial>[] = [
    {
      header: 'Serial Number',
      key: 'serialNumber',
      render: (s) => (
        <code
          style={{
            backgroundColor: '#F3F4F6',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #E5E7EB',
            fontSize: '12px',
          }}
        >
          {s.serialNumber}
        </code>
      ),
    },
    {
      header: 'Condition / State',
      key: 'state',
      render: (s) => (
        <StatusBadge
          type="condition"
          status={s.conditionLabel || s.state}
        />
      ),
    },
    {
      header: 'Current Location',
      key: 'currentWarehouse',
      render: (s) => {
        if (s.currentProject) {
          return (
            <span style={{ fontWeight: 600, color: '#1F2839' }}>
              {s.currentProject.name || s.currentProject.location}
            </span>
          );
        }
        if (s.currentWarehouse) {
          return (
            <span style={{ fontWeight: 600, color: '#1F2839' }}>
              {s.currentWarehouse.cityCode || s.currentWarehouse.name}
            </span>
          );
        }
        return '-';
      },
    },
    {
      header: 'Condition',
      key: 'conditionLabel',
      render: (s) => (
        <StatusBadge
          type="condition"
          status={s.conditionLabel || s.state}
        />
      ),
    },
    {
      header: 'Current Status',
      key: 'state',
      render: (s) => {
        let statusText = 'In Warehouse';
        let badgeVariant: 'active' | 'inactive' | 'pending' = 'active';

        if (s.currentProject) {
          statusText = 'Deploy';
          badgeVariant = 'pending';
        } else {
          const condLower = (s.conditionLabel || s.state || '').toLowerCase();
          if (s.state === 'UNDER_REPAIR' || condLower.includes('repair')) {
            statusText = 'Under Repair';
            badgeVariant = 'inactive';
          } else if (s.state === 'STANDBY_BAD' || condLower.includes('bad')) {
            statusText = 'Standby Bad';
            badgeVariant = 'inactive';
          } else if (s.state === 'STANDBY_GOOD' || condLower.includes('good')) {
            statusText = 'Standby Good';
            badgeVariant = 'active';
          }
        }

        return (
          <span className={`badge-status badge-${badgeVariant}`}>
            {statusText}
          </span>
        );
      },
    },
    {
      header: 'Note',
      key: 'notes',
      render: (s) => (
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {s.notes || '-'}
        </span>
      ),
    },
  ];

  const unitDisplay = item.unit?.symbol || item.unit?.name || '-';

  return (
    <div className="page-container">
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft size={16} /> Back to Stock List
        </Button>
      </div>

      <PageHeader
        title={item.name}
        description={`Brand: ${item.brand || 'N/A'} • MN: ${item.modelNumber || 'N/A'} • Unit: ${unitDisplay}`}
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <StatusBadge status={item.isActive} />
            <Button variant="primary" size="sm" onClick={() => setIsEditModalOpen(true)}>
              <Edit2 size={14} /> Edit Item
            </Button>
          </div>
        }
      />

      <Card title="Item Master Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Brand</span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{item.brand || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Model Number / MN</span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{item.modelNumber || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Tracking Type</span>
            <div style={{ marginTop: '4px' }}><StatusBadge type="tracking" status={item.trackingType} /></div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Unit of Measure</span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>
              {unitDisplay}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Status</span>
            <div style={{ marginTop: '4px' }}><StatusBadge status={item.isActive} /></div>
          </div>
        </div>
      </Card>

      {/* Bulk Stock Breakdown by Location */}
      {item.trackingType === 'BULK' && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2839', marginBottom: '16px' }}>
            Current Warehouse Stock Distribution
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Quantity on Hand</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {balances && balances.length > 0 ? (
                  balances.map((ws) => (
                    <tr key={ws.id}>
                      <td style={{ fontWeight: 600, color: '#1F2839' }}>
                        {ws.warehouse.cityCode || ws.warehouse.name}
                      </td>
                      <td style={{ fontWeight: 600 }}>{ws.quantity}</td>
                      <td>{unitDisplay}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>
                      No active stock in any warehouse.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Serialized Item Serials List */}
      {item.trackingType === 'SERIALIZED' && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2839', marginBottom: '16px' }}>
            Current Serialized Devices
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

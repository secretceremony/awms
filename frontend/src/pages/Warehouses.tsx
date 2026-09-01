import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, ConfirmModal } from '../components/ui/index.js';
import { WarehouseFormModal, type Warehouse } from '../components/warehouse/WarehouseFormModal.js';

interface WarehouseStock {
  itemId: number;
  itemName: string;
  brand: string;
  trackingType: 'BULK' | 'SERIALIZED';
  quantity: number;
  unit: string | null;
  symbol: string | null;
  serialNumbers?: string[];
}

export const Warehouses = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail View State
  const [viewingWarehouse, setViewingWarehouse] = useState<Warehouse | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Confirm Deactivate State
  const [deactivatingWarehouse, setDeactivatingWarehouse] = useState<Warehouse | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const openCreateModal = () => {
    setEditingWarehouse(null);
    setIsModalOpen(true);
  };

  const openEditModal = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setIsModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivatingWarehouse) return;
    setIsDeactivating(true);
    try {
      await apiClient.delete(`/warehouses/${deactivatingWarehouse.id}/deactivate`);
      setRefreshKey((k) => k + 1);
      if (viewingWarehouse?.id === deactivatingWarehouse.id) {
        setViewingWarehouse((prev) => (prev ? { ...prev, isActive: false } : null));
      }
      setDeactivatingWarehouse(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate warehouse');
    } finally {
      setIsDeactivating(false);
    }
  };

  const listColumns: Column<Warehouse>[] = [
    { header: 'Name', key: 'name' },
    { header: 'City', key: 'city' },
    { header: 'City Code', key: 'cityCode' },
    { header: 'Location', key: 'location' },
    {
      header: 'Status',
      key: 'isActive',
      render: (item) => <StatusBadge status={item.isActive} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => setViewingWarehouse(item)}
            title="View Details & Stock"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => openEditModal(item)}
            title="Edit Warehouse"
          >
            <Edit2 size={16} />
          </button>
          {item.isActive && (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setDeactivatingWarehouse(item)}
              title="Deactivate Warehouse"
            >
              <PowerOff size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const stockColumns: Column<WarehouseStock>[] = [
    { header: 'Item Name', key: 'itemName' },
    { header: 'Brand', key: 'brand', render: (item) => item.brand || '-' },
    {
      header: 'Tracking Type',
      key: 'trackingType',
      render: (item) => (
        <StatusBadge type="tracking" status={item.trackingType} />
      ),
    },
    {
      header: 'Quantity',
      key: 'quantity',
      render: (item) => `${item.quantity} ${item.symbol || item.unit || ''}`,
    },
    {
      header: 'Serial Numbers',
      key: 'serialNumbers',
      render: (item) => {
        if (item.trackingType !== 'SERIALIZED' || !item.serialNumbers?.length) {
          return '-';
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
            {item.serialNumbers.map((sn, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#F3F4F6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {sn}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      {viewingWarehouse ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingWarehouse(null)}
            >
              <ArrowLeft size={16} /> Back to Warehouses List
            </Button>
          </div>

          <PageHeader
            title={viewingWarehouse.name}
            description={`Warehouse Code: ${viewingWarehouse.cityCode} • Location: ${viewingWarehouse.location}`}
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <StatusBadge status={viewingWarehouse.isActive} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(viewingWarehouse)}
                >
                  <Edit2 size={14} /> Edit
                </Button>
                {viewingWarehouse.isActive && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeactivatingWarehouse(viewingWarehouse)}
                  >
                    <PowerOff size={14} /> Deactivate
                  </Button>
                )}
              </div>
            }
          />

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2839', marginBottom: '16px' }}>
              Current Warehouse Stock
            </h3>
            <PaginatedTable<WarehouseStock>
              key={`warehouse-stocks-${viewingWarehouse.id}`}
              fetchUrl={`/warehouses/${viewingWarehouse.id}/stocks`}
              searchPlaceholder="Search stock items by name or brand..."
              columns={stockColumns}
            />
          </div>
        </div>
      ) : (
        <div>
          <PageHeader
            title="Warehouses"
            description="Manage warehouse locations and view real-time stocks."
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Select
                  style={{ width: '130px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </Select>

                <Button variant="primary" onClick={openCreateModal}>
                  Add Warehouse
                </Button>
              </div>
            }
          />

          <PaginatedTable<Warehouse>
            key={`warehouses-${statusFilter}-${refreshKey}`}
            fetchUrl="/warehouses"
            searchPlaceholder="Search warehouses by name, city, or location..."
            extraParams={{ status: statusFilter }}
            columns={listColumns}
          />
        </div>
      )}

      {/* Form Modal */}
      <WarehouseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        warehouse={editingWarehouse}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={!!deactivatingWarehouse}
        onClose={() => setDeactivatingWarehouse(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Warehouse"
        message={`Are you sure you want to deactivate warehouse "${deactivatingWarehouse?.name}"? It will no longer receive new incoming movements.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};

export default Warehouses;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Edit2, PowerOff, Plus, Layers } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, ConfirmModal } from '../../components/ui/index.js';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';
import { InitialStockModal } from '../../components/inventory/InitialStockModal.js';

export const StockList = () => {
  const navigate = useNavigate();
  const [trackingFilter, setTrackingFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

  // Deactivate
  const [deactivatingItem, setDeactivatingItem] = useState<Item | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const openCreateModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivatingItem) return;
    setIsDeactivating(true);
    try {
      await apiClient.delete(`/items/${deactivatingItem.id}/deactivate`);
      setRefreshKey((k) => k + 1);
      setDeactivatingItem(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate item');
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns: Column<Item>[] = [
    { header: 'Item Name', key: 'name' },
    { header: 'Brand', key: 'brand', render: (item) => item.brand || '-' },
    {
      header: 'Unit',
      key: 'unit',
      render: (item) => item.unit?.name || '-',
    },
    {
      header: 'Tracking Type',
      key: 'trackingType',
      render: (item) => (
        <StatusBadge type="tracking" status={item.trackingType} />
      ),
    },
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
            onClick={() => navigate(`/inventory/item/${item.id}`)}
            title="View Details & Serial Numbers"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => openEditModal(item)}
            title="Edit Item"
          >
            <Edit2 size={16} />
          </button>
          {item.isActive && (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setDeactivatingItem(item)}
              title="Deactivate Item"
            >
              <PowerOff size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Master Inventory"
        description="Catalog of stock items, serialized devices, and tracking specifications."
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Select
              style={{ width: '150px' }}
              value={trackingFilter}
              onChange={(e) => setTrackingFilter(e.target.value)}
            >
              <option value="all">All Tracking</option>
              <option value="BULK">Bulk Only</option>
              <option value="SERIALIZED">Serialized Only</option>
            </Select>

            <Button variant="secondary" onClick={() => setIsInitialStockModalOpen(true)}>
              <Layers size={16} /> Initial Stock
            </Button>

            <Button variant="primary" onClick={openCreateModal}>
              <Plus size={16} /> Add Item
            </Button>
          </div>
        }
      />

      <PaginatedTable<Item>
        key={`items-${trackingFilter}-${refreshKey}`}
        fetchUrl="/items"
        searchPlaceholder="Search items by name or brand..."
        extraParams={{
          trackingType: trackingFilter !== 'all' ? trackingFilter : undefined,
        }}
        columns={columns}
      />

      {/* Item Form Modal */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={editingItem}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Initial Stock Modal */}
      <InitialStockModal
        isOpen={isInitialStockModalOpen}
        onClose={() => setIsInitialStockModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={!!deactivatingItem}
        onClose={() => setDeactivatingItem(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Item"
        message={`Are you sure you want to deactivate item "${deactivatingItem?.name}"? Deactivated items cannot be selected for new stock movements.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};

export default StockList;

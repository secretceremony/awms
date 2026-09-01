import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Edit2, PowerOff } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, ConfirmModal } from '../components/ui/index.js';
import { UnitFormModal, type Unit } from '../components/unit/UnitFormModal.js';

export const Units = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Confirm Deactivate State
  const [deactivatingUnit, setDeactivatingUnit] = useState<Unit | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const openCreateModal = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivatingUnit) return;
    setIsDeactivating(true);
    try {
      await apiClient.delete(`/units/${deactivatingUnit.id}/deactivate`);
      setRefreshKey((k) => k + 1);
      setDeactivatingUnit(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate unit');
    } finally {
      setIsDeactivating(false);
    }
  };

  const listColumns: Column<Unit>[] = [
    { header: 'Name', key: 'name' },
    {
      header: 'Symbol',
      key: 'symbol',
      render: (item) => (item.symbol ? <code>{item.symbol}</code> : '-'),
    },
    {
      header: 'Description',
      key: 'description',
      render: (item) => item.description || '-',
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
            onClick={() => openEditModal(item)}
            title="Edit Unit"
          >
            <Edit2 size={16} />
          </button>
          {item.isActive && (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setDeactivatingUnit(item)}
              title="Deactivate Unit"
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
        title="Units of Measurement"
        description="Manage measurement units for inventory tracking."
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
              Add Unit
            </Button>
          </div>
        }
      />

      <PaginatedTable<Unit>
        key={`units-${statusFilter}-${refreshKey}`}
        fetchUrl="/units"
        searchPlaceholder="Search units by name or symbol..."
        extraParams={{ status: statusFilter }}
        columns={listColumns}
      />

      {/* Form Modal */}
      <UnitFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unit={editingUnit}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={!!deactivatingUnit}
        onClose={() => setDeactivatingUnit(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Unit"
        message={`Are you sure you want to deactivate unit "${deactivatingUnit?.name}"? It will no longer be selectable for new items.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};

export default Units;

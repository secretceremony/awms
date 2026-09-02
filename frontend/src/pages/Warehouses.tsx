import React, { useState } from 'react';
import {
  PageHeader,
  Button,
  Select,
  StatusBadge,
  ConfirmModal,
} from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { WarehouseFormModal, type Warehouse } from '../components/warehouse/WarehouseFormModal.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, MapPin } from 'lucide-react';

export const Warehouses: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // Confirm modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedWarehouse(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsFormModalOpen(true);
  };

  const handleDeactivate = (warehouse: Warehouse) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate Warehouse',
      message: `Are you sure you want to deactivate "${warehouse.name}"? Deactivation is allowed only if this warehouse has zero active stock.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/warehouses/${warehouse.id}/deactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to deactivate warehouse');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReactivate = (warehouse: Warehouse) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate Warehouse',
      message: `Reactivate "${warehouse.name}" for stock storage and logistics operations?`,
      confirmText: 'Reactivate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/warehouses/${warehouse.id}/reactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to reactivate warehouse');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleDelete = (warehouse: Warehouse) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Warehouse',
      message: `Are you sure you want to permanently delete "${warehouse.name}"? This action is only permitted if this warehouse has NEVER been referenced in any movements or stock records.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/warehouses/${warehouse.id}`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete warehouse');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const columns: Column<Warehouse>[] = [
    {
      key: 'name',
      header: 'Warehouse Name',
      render: (w: Warehouse) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{w.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: #{w.id}</span>
        </div>
      ),
    },
    {
      key: 'cityCode',
      header: 'City Code',
      render: (w: Warehouse) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(34, 80, 161, 0.08)',
            color: '#2250A1',
            border: '1px solid rgba(34, 80, 161, 0.2)',
          }}
        >
          {w.cityCode}
        </span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (w: Warehouse) => <span style={{ fontWeight: 500 }}>{w.city}</span>,
    },
    {
      key: 'location',
      header: 'Location Address',
      render: (w: Warehouse) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
          <MapPin size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <span>{w.location}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (w: Warehouse) => <StatusBadge status={w.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (w: Warehouse) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(w)} title="Edit Warehouse">
            <Edit2 size={14} />
          </Button>
          {w.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(w)}
              title="Deactivate Warehouse"
              style={{ color: '#EF4444' }}
            >
              <Ban size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(w)}
              title="Reactivate Warehouse"
              style={{ color: '#10B981' }}
            >
              <CheckCircle size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(w)}
            title="Delete Warehouse"
            style={{ color: '#6B7280' }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Warehouses"
        description="Manage warehouse hubs, physical storage facilities, and canonical city locations"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Warehouse
          </Button>
        }
      />

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          {actionError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ width: '180px' }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </Select>
        </div>
      </div>

      <PaginatedTable<Warehouse>
        fetchUrl="/warehouses"
        searchPlaceholder="Search warehouse name, city, city code, or address..."
        columns={columns}
        extraParams={{
          status: statusFilter,
          _refresh: refreshTrigger,
        }}
      />

      <WarehouseFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        warehouse={selectedWarehouse}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default Warehouses;

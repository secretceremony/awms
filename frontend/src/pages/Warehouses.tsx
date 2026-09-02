import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Select,
  StatusBadge,
  ConfirmModal,
} from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { WarehouseFormModal, type Warehouse } from '../components/warehouse/WarehouseFormModal.js';
import { FilterBar, type ActiveFilter } from '../components/filters/index.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, MapPin } from 'lucide-react';

export const Warehouses: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';

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

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    if (!('page' in updates)) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeFilters: ActiveFilter[] = [];
  if (statusFilter && statusFilter !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      valueDisplay: statusFilter.toUpperCase(),
      onClear: () => updateFilters({ status: null }),
    });
  }

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
      message: `Are you sure you want to delete "${warehouse.name}"? This action is only allowed if this warehouse has never had stock or movements.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/warehouses/${warehouse.id}`, { method: 'DELETE' });
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
      render: (warehouse: Warehouse) => (
        <span style={{ fontWeight: 600, color: '#1F2839' }}>{warehouse.name}</span>
      ),
    },
    {
      key: 'cityCode',
      header: 'City Code',
      render: (warehouse: Warehouse) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(34, 80, 161, 0.08)',
            color: '#2250A1',
            border: '1px solid rgba(34, 80, 161, 0.2)',
          }}
        >
          {warehouse.cityCode || '—'}
        </span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (warehouse: Warehouse) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
          <MapPin size={14} style={{ color: '#2250A1' }} />
          <span>{warehouse.city}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location Address',
      render: (warehouse: Warehouse) => (
        <span style={{ color: '#4B5563', fontSize: '0.875rem' }}>{warehouse.location}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (warehouse: Warehouse) => (
        <StatusBadge status={warehouse.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (warehouse: Warehouse) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(warehouse)}
            title="Edit Warehouse"
          >
            <Edit2 size={14} />
          </Button>

          {warehouse.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(warehouse)}
              title="Deactivate Warehouse"
              style={{ color: '#EF4444' }}
            >
              <Ban size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(warehouse)}
              title="Reactivate Warehouse"
              style={{ color: '#10B981' }}
            >
              <CheckCircle size={14} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(warehouse)}
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
        description="Physical storage hubs, city associations, and distribution points"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Warehouse
          </Button>
        }
      />

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
          {actionError}
        </div>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search warehouse name, city, or address..."
        primaryFilter={
          <div style={{ width: '160px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </div>
        }
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <PaginatedTable<Warehouse>
        fetchUrl="/warehouses"
        searchPlaceholder="Search warehouses..."
        columns={columns}
        extraParams={{
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
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

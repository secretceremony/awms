import React, { useState } from 'react';
import {
  PageHeader,
  Button,
  Select,
  StatusBadge,
  ConfirmModal,
} from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { UnitFormModal, type Unit } from '../components/unit/UnitFormModal.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2 } from 'lucide-react';

export const Units: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

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
    setSelectedUnit(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsFormModalOpen(true);
  };

  const handleDeactivate = (unit: Unit) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate Unit',
      message: `Deactivate unit "${unit.name}" (${unit.symbol})? Inactive units cannot be assigned to new items. Existing items will preserve their historical unit.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/units/${unit.id}/deactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to deactivate unit');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReactivate = (unit: Unit) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate Unit',
      message: `Reactivate unit "${unit.name}" (${unit.symbol}) for new item registration?`,
      confirmText: 'Reactivate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/units/${unit.id}/reactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to reactivate unit');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleDelete = (unit: Unit) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Unit',
      message: `Are you sure you want to permanently delete unit "${unit.name}"? This action is only permitted if this unit is not assigned to any items.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/units/${unit.id}`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete unit');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const columns: Column<Unit>[] = [
    {
      key: 'name',
      header: 'Unit Name',
      render: (unit: Unit) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{unit.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: #{unit.id}</span>
        </div>
      ),
    },
    {
      key: 'symbol',
      header: 'Symbol',
      render: (unit: Unit) => (
        <span
          style={{
            display: 'inline-block',
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
          {unit.symbol}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (unit: Unit) => <StatusBadge status={unit.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (unit: Unit) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)} title="Edit Unit">
            <Edit2 size={14} />
          </Button>
          {unit.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(unit)}
              title="Deactivate Unit"
              style={{ color: '#EF4444' }}
            >
              <Ban size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(unit)}
              title="Reactivate Unit"
              style={{ color: '#10B981' }}
            >
              <CheckCircle size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(unit)}
            title="Delete Unit"
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
        title="Units of Measurement"
        description="Standardized units and lowercase symbols for bulk and serialized inventory items"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Unit
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

      <PaginatedTable<Unit>
        fetchUrl="/units"
        searchPlaceholder="Search unit name or symbol..."
        columns={columns}
        extraParams={{
          status: statusFilter,
          _refresh: refreshTrigger,
        }}
      />

      <UnitFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        unit={selectedUnit}
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

export default Units;

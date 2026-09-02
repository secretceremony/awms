import React, { useState } from 'react';
import { Button, Select, StatusBadge, ConfirmModal } from '../ui/index.js';
import { PaginatedTable, type Column } from '../PaginatedTable.js';
import { UnitFormModal, type Unit } from '../unit/UnitFormModal.js';
import { apiClient } from '../../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, Ruler } from 'lucide-react';

export const UnitSettings: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

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
    setIsModalOpen(true);
  };

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsModalOpen(true);
  };

  const handleDeactivate = (unit: Unit) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate Unit',
      message: `Deactivate unit "${unit.name}" (${unit.symbol})? Inactive units cannot be assigned to new items.`,
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
      message: `Are you sure you want to permanently delete unit "${unit.name}"? This is only allowed if no items reference this unit.`,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Ruler size={15} style={{ color: '#2250A1' }} />
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{unit.name}</span>
        </div>
      ),
    },
    {
      key: 'symbol',
      header: 'Symbol',
      render: (unit: Unit) => (
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1F2839' }}>
            Units of Measurement
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
            Standard units and lowercase symbols (e.g. pcs, set, roll, m) for item registration and stock tracking.
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={16} /> Add Unit
        </Button>
      </div>

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          {actionError}
        </div>
      )}

      <div style={{ marginBottom: '1rem', width: '180px' }}>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </Select>
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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

import React, { useState } from 'react';
import { Button, Select, StatusBadge, ConfirmModal } from '../ui/index.js';
import { PaginatedTable, type Column } from '../PaginatedTable.js';
import { CityFormModal, type City } from '../city/CityFormModal.js';
import { apiClient } from '../../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, MapPin } from 'lucide-react';

export const CitySettings: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

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
    setSelectedCity(null);
    setIsModalOpen(true);
  };

  const handleEdit = (city: City) => {
    setSelectedCity(city);
    setIsModalOpen(true);
  };

  const handleDeactivate = (city: City) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate City',
      message: `Deactivate city "${city.name}" (${city.code})? Inactive cities cannot be selected for new warehouses.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.patch(`/cities/${city.id}/deactivate`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to deactivate city');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReactivate = (city: City) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate City',
      message: `Reactivate city "${city.name}" (${city.code}) for warehouse location assignments?`,
      confirmText: 'Reactivate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.patch(`/cities/${city.id}/reactivate`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to reactivate city');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleDelete = (city: City) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete City Configuration',
      message: `Are you sure you want to delete city "${city.name}" (${city.code})? This is only allowed if no warehouses reference this city.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/cities/${city.id}`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete city');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const columns: Column<City>[] = [
    {
      key: 'name',
      header: 'City Name',
      render: (city: City) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={15} style={{ color: '#2250A1' }} />
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{city.name}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'City Code',
      render: (city: City) => (
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
          {city.code}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (city: City) => <StatusBadge status={city.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (city: City) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(city)} title="Edit City">
            <Edit2 size={14} />
          </Button>
          {city.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(city)}
              title="Deactivate City"
              style={{ color: '#EF4444' }}
            >
              <Ban size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(city)}
              title="Reactivate City"
              style={{ color: '#10B981' }}
            >
              <CheckCircle size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(city)}
            title="Delete City"
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
            Configured Cities
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
            Preconfigured cities and canonical 3-letter codes used when creating and organizing warehouses.
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={16} /> Add City
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

      <PaginatedTable<City>
        fetchUrl="/cities"
        searchPlaceholder="Search city name or code..."
        columns={columns}
        extraParams={{
          status: statusFilter,
          _refresh: refreshTrigger,
        }}
      />

      <CityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        city={selectedCity}
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

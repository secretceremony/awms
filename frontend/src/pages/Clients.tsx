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
import { ClientFormModal, type Client } from '../components/client/ClientFormModal.js';
import { ClientContactsModal } from '../components/client/ClientContactsModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../components/filters/index.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, Users } from 'lucide-react';

export const Clients: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const typeFilter = searchParams.get('type') || 'all';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [contactsClient, setContactsClient] = useState<Client | null>(null);

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
  if (typeFilter && typeFilter !== 'all') {
    activeFilters.push({
      key: 'type',
      label: 'Client Type',
      valueDisplay: typeFilter.toUpperCase(),
      onClear: () => updateFilters({ type: null }),
    });
  }

  const handleCreate = () => {
    setSelectedClient(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsFormModalOpen(true);
  };

  const handleOpenContacts = (client: Client) => {
    setContactsClient(client);
    setIsContactsModalOpen(true);
  };

  const handleDeactivate = (client: Client) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate Client',
      message: `Are you sure you want to deactivate "${client.name}"? Deactivation is allowed only if this client has no active projects.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/clients/${client.id}/deactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to deactivate client');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReactivate = (client: Client) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate Client',
      message: `Reactivate "${client.name}" for new projects and contracts?`,
      confirmText: 'Reactivate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/clients/${client.id}/reactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to reactivate client');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleDelete = (client: Client) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Client',
      message: `Are you sure you want to delete "${client.name}"? Deletion is only allowed if this client has NEVER had any projects or delivery orders.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/clients/${client.id}`, { method: 'DELETE' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete client');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Company / Client Name',
      render: (client: Client) => (
        <span style={{ fontWeight: 600, color: '#1F2839' }}>{client.name}</span>
      ),
    },
    {
      key: 'clientType',
      header: 'Client Type',
      render: (client: Client) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.75rem',
            backgroundColor: client.clientType === 'PHM' ? 'rgba(34, 80, 161, 0.1)' : '#F3F4F6',
            color: client.clientType === 'PHM' ? '#2250A1' : '#4B5563',
            border: `1px solid ${client.clientType === 'PHM' ? 'rgba(34, 80, 161, 0.2)' : '#E5E7EB'}`,
          }}
        >
          {client.clientType}
        </span>
      ),
    },
    {
      key: 'contacts',
      header: 'PIC / Contacts',
      render: (client: Client) => {
        const count = client.contacts ? client.contacts.length : 0;
        const primary = client.contacts && client.contacts.length > 0 ? client.contacts[0] : null;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500, color: '#1F2839', fontSize: '0.85rem' }}>
                {primary ? primary.name : '—'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {primary ? primary.phone || primary.email : ''}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenContacts(client)}
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: 'auto',
              }}
            >
              <Users size={12} />
              <span>{count} PIC{count !== 1 ? 's' : ''}</span>
            </Button>
          </div>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (client: Client) => (
        <StatusBadge status={client.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (client: Client) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(client)}
            title="Edit Client"
          >
            <Edit2 size={14} />
          </Button>

          {client.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(client)}
              title="Deactivate Client"
              style={{ color: '#EF4444' }}
            >
              <Ban size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(client)}
              title="Reactivate Client"
              style={{ color: '#10B981' }}
            >
              <CheckCircle size={14} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(client)}
            title="Delete Client"
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
        title="Client Management"
        description="Business clients, contract partner profiles, and designated PIC directories"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Client
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
        searchPlaceholder="Search company name, PIC name, email, or phone..."
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
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Client Type
          </label>
          <Select
            value={typeFilter}
            onChange={(e) => updateFilters({ type: e.target.value })}
          >
            <option value="all">All Types</option>
            <option value="PHM">PHM</option>
            <option value="OTHER">OTHER</option>
          </Select>
        </div>
      </FilterPanel>

      <PaginatedTable<Client>
        fetchUrl="/clients"
        searchPlaceholder="Search clients..."
        columns={columns}
        extraParams={{
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          search: search || undefined,
          _refresh: refreshTrigger,
        }}
      />

      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        client={selectedClient}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ClientContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        client={contactsClient}
        onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
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

export default Clients;

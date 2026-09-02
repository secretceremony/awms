import React, { useState } from 'react';
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
import { apiClient } from '../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, Users } from 'lucide-react';

export const Clients: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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
      message: `Are you sure you want to deactivate "${client.name}"? Inactive clients cannot be assigned to new projects.`,
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
      message: `Reactivate "${client.name}" for new project assignments?`,
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
      message: `Are you sure you want to permanently delete "${client.name}"? This action cannot be undone and is only allowed if this client is completely unreferenced.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/clients/${client.id}`);
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
      header: 'Company',
      render: (client: Client) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{client.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: #{client.id}</span>
        </div>
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
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            backgroundColor: client.clientType === 'PHM' ? 'rgba(34, 80, 161, 0.1)' : 'rgba(107, 114, 128, 0.1)',
            color: client.clientType === 'PHM' ? '#2250A1' : '#4B5563',
            border: `1px solid ${client.clientType === 'PHM' ? 'rgba(34, 80, 161, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`,
          }}
        >
          {client.clientType || 'OTHER'}
        </span>
      ),
    },
    {
      key: 'contacts',
      header: 'Contacts',
      render: (client: Client) => {
        const count = client._count?.contacts ?? client.contacts?.length ?? 0;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenContacts(client)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
          >
            <Users size={14} style={{ color: '#2250A1' }} />
            <span>{count} Contact{count !== 1 ? 's' : ''}</span>
          </Button>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      render: (client: Client) => (
        <span style={{ color: client.email ? '#374151' : '#9CA3AF' }}>
          {client.email || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (client: Client) => (
        <span style={{ color: client.phone ? '#374151' : '#9CA3AF' }}>
          {client.phone || '—'}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (client: Client) => (
        <span
          style={{
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            color: client.address ? '#374151' : '#9CA3AF',
          }}
          title={client.address || ''}
        >
          {client.address || '—'}
        </span>
      ),
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
            onClick={() => handleOpenContacts(client)}
            title="Manage Contacts"
          >
            <Users size={14} />
          </Button>
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
        description="Manage client companies, contacts, and operational logistics details"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Client
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="PHM">PHM Only</option>
            <option value="OTHER">OTHER Only</option>
          </Select>
        </div>
        <div style={{ width: '160px' }}>
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

      <PaginatedTable<Client>
        fetchUrl="/clients"
        searchPlaceholder="Search company, contact person, email, or address..."
        columns={columns}
        extraParams={{
          status: statusFilter,
          clientType: typeFilter,
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

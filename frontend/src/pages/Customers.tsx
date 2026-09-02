import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Edit2, PowerOff, Plus } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, ConfirmModal } from '../components/ui/index.js';
import { CustomerFormModal, type Customer } from '../components/customer/CustomerFormModal.js';

export const Customers = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Confirm Deactivate State
  const [deactivatingCustomer, setDeactivatingCustomer] = useState<Customer | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setIsModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivatingCustomer) return;
    setIsDeactivating(true);
    try {
      await apiClient.delete(`/customers/${deactivatingCustomer.id}/deactivate`);
      setRefreshKey((k) => k + 1);
      setDeactivatingCustomer(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  const listColumns: Column<Customer>[] = [
    {
      header: 'Company',
      key: 'name',
      render: (item) => <span style={{ fontWeight: 600, color: '#1F2839' }}>{item.name}</span>,
    },
    {
      header: 'Code',
      key: 'code',
      render: (item) => (item.code ? <code>{item.code}</code> : '-'),
    },
    {
      header: 'Attn / PIC',
      key: 'attnName',
      render: (item) => item.attnName || '-',
    },
    {
      header: 'Email',
      key: 'email',
      render: (item) => item.email || '-',
    },
    {
      header: 'Phone',
      key: 'phone',
      render: (item) => item.phone || '-',
    },
    {
      header: 'Address',
      key: 'address',
      render: (item) => (
        <span style={{ fontSize: '12px', color: '#4B5563', maxWidth: '240px', display: 'inline-block' }}>
          {item.address || '-'}
        </span>
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
            onClick={() => openEditModal(item)}
            title="Edit User / Company"
          >
            <Edit2 size={16} />
          </button>
          {item.isActive && (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setDeactivatingCustomer(item)}
              title="Deactivate User"
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
        title="User Management"
        description="Manage business client companies, contractors, and contact personnel."
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
              <Plus size={16} /> Add User
            </Button>
          </div>
        }
      />

      <PaginatedTable<Customer>
        key={`customers-table-${statusFilter}-${refreshKey}`}
        fetchUrl="/customers"
        searchPlaceholder="Search by company name, code, contact person, or email..."
        extraParams={{
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }}
        columns={listColumns}
      />

      {/* Create / Edit User Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={!!deactivatingCustomer}
        onClose={() => setDeactivatingCustomer(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User / Company"
        message={`Are you sure you want to deactivate user "${deactivatingCustomer?.name}"? Projects already linked to this user will remain intact.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};

export default Customers;

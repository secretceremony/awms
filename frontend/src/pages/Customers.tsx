import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  code: string | null;
  attnName: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Customers = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail View State
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    attnName: '',
    phone: '',
    address: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openModal = (cust?: Customer) => {
    setErrorMsg(null);
    if (cust) {
      setEditingCustomer(cust);
      setFormData({
        name: cust.name,
        code: cust.code || '',
        attnName: cust.attnName || '',
        phone: cust.phone || '',
        address: cust.address || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        code: '',
        attnName: '',
        phone: '',
        address: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.trim() || undefined,
        attnName: formData.attnName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      if (editingCustomer) {
        await apiClient.request(`/customers/${editingCustomer.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/customers', payload);
      }

      setRefreshKey((k) => k + 1);
      closeModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (cust: Customer) => {
    if (!window.confirm(`Are you sure you want to deactivate customer "${cust.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/customers/${cust.id}/deactivate`);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate customer');
    }
  };

  const listColumns: Column<Customer>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Code', key: 'code', render: (item) => item.code || '-' },
    { header: 'Attn / PIC', key: 'attnName', render: (item) => item.attnName || '-' },
    { header: 'Phone', key: 'phone', render: (item) => item.phone || '-' },
    { header: 'Address', key: 'address', render: (item) => item.address || '-' },
    {
      header: 'Status',
      key: 'isActive',
      render: (item) => (
        <span className={`badge-status ${item.isActive ? 'active' : 'inactive'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewingCustomer(item)}
            title="View Details"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#2250A1',
            }}
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openModal(item)}
            title="Edit Customer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#4B5563',
            }}
          >
            <Edit2 size={16} />
          </button>
          {item.isActive && (
            <button
              onClick={() => handleDeactivate(item)}
              title="Deactivate Customer"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#EF4444',
              }}
            >
              <PowerOff size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (viewingCustomer) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        {/* Detail Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setViewingCustomer(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '8px',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1F2839' }}>
              {viewingCustomer.name}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B5B8BF' }}>
              Customer detailed profile registration.
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="content-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1F2839' }}>
            Customer Profile
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Customer Code
              </span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                {viewingCustomer.code || '-'}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Attn / PIC
              </span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                {viewingCustomer.attnName || '-'}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Phone Number
              </span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                {viewingCustomer.phone || '-'}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Status
              </span>
              <span className={`badge-status ${viewingCustomer.isActive ? 'active' : 'inactive'}`}>
                {viewingCustomer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          {viewingCustomer.address && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #F0F1F2', paddingTop: '16px' }}>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Address
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                {viewingCustomer.address}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1F2839' }}>Customers</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B5B8BF' }}>
            Manage client profiles, partner codes, contacts, and delivery locations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              fontSize: '14px',
              color: '#1F2839',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <button
            onClick={() => openModal()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2250A1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Add Customer
          </button>
        </div>
      </div>

      <div className="content-card" style={{ padding: 0 }}>
        <PaginatedTable<Customer>
          columns={listColumns}
          fetchUrl="/customers"
          searchPlaceholder="Search customers by name, code, PIC, or phone..."
          extraParams={{
            refreshKey,
            status: statusFilter,
          }}
        />
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              width: '450px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#1F2839' }}>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </h3>
            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. TELKOM (will be converted to uppercase)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '6px',
                    }}
                  >
                    Attn / PIC
                  </label>
                  <input
                    type="text"
                    value={formData.attnName}
                    onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '6px',
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '6px',
                  }}
                >
                  Address
                </label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2250A1',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Customers;

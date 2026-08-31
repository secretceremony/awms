import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';

interface Warehouse {
  id: number;
  name: string;
  city: string;
  cityCode: string;
  location: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseStock {
  itemId: number;
  itemName: string;
  sku: string;
  trackingType: 'BULK' | 'SERIALIZED';
  quantity: number;
  unit: string | null;
  symbol: string | null;
  serialNumbers?: string[];
}

export const Warehouses = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail View State
  const [viewingWarehouse, setViewingWarehouse] = useState<Warehouse | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    cityCode: '',
    location: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openModal = (wh?: Warehouse) => {
    setErrorMsg(null);
    if (wh) {
      setEditingWarehouse(wh);
      setFormData({
        name: wh.name,
        city: wh.city,
        cityCode: wh.cityCode,
        location: wh.location,
        description: wh.description || '',
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        city: '',
        cityCode: '',
        location: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name,
        city: formData.city,
        cityCode: formData.cityCode,
        location: formData.location,
        description: formData.description || undefined,
      };

      if (editingWarehouse) {
        await apiClient.request(`/warehouses/${editingWarehouse.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/warehouses', payload);
      }

      setRefreshKey((k) => k + 1);
      closeModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the warehouse');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (wh: Warehouse) => {
    if (!window.confirm(`Are you sure you want to deactivate warehouse "${wh.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/warehouses/${wh.id}/deactivate`);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate warehouse');
    }
  };

  const listColumns: Column<Warehouse>[] = [
    { header: 'Name', key: 'name' },
    { header: 'City', key: 'city' },
    { header: 'City Code', key: 'cityCode' },
    { header: 'Location', key: 'location' },
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
            onClick={() => setViewingWarehouse(item)}
            title="View Details & Stock"
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
            title="Edit Warehouse"
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
              title="Deactivate Warehouse"
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

  const stockColumns: Column<WarehouseStock>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Item Name', key: 'itemName' },
    { header: 'Type', key: 'trackingType', render: (item) => (
        <span style={{ fontSize: '12px', fontWeight: 500, color: item.trackingType === 'SERIALIZED' ? '#8B5CF6' : '#10B981' }}>
          {item.trackingType}
        </span>
      )
    },
    { header: 'Quantity', key: 'quantity', render: (item) => `${item.quantity} ${item.symbol || item.unit || ''}` },
    {
      header: 'Serial Numbers',
      key: 'serialNumbers',
      render: (item) => {
        if (item.trackingType !== 'SERIALIZED') return <span style={{ color: '#9CA3AF' }}>-</span>;
        if (!item.serialNumbers || item.serialNumbers.length === 0) {
          return <span style={{ color: '#EF4444', fontSize: '13px' }}>No active serials</span>;
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
            {item.serialNumbers.map((sn, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {sn}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  if (viewingWarehouse) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        {/* Detail Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setViewingWarehouse(null)}
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
              {viewingWarehouse.name}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B5B8BF' }}>
              Warehouse detailed configurations and current stock status.
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="content-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1F2839' }}>
            Warehouse Profile
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
                City
              </span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>{viewingWarehouse.city}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                City Code
              </span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>{viewingWarehouse.cityCode}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Location Address
              </span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>{viewingWarehouse.location}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Status
              </span>
              <span className={`badge-status ${viewingWarehouse.isActive ? 'active' : 'inactive'}`}>
                {viewingWarehouse.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          {viewingWarehouse.description && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #F0F1F2', paddingTop: '16px' }}>
              <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                Description
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#4B5563' }}>
                {viewingWarehouse.description}
              </p>
            </div>
          )}
        </div>

        {/* Stock Detail section */}
        <div className="content-card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0F1F2' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2839' }}>
              Warehouse Stock Ledger
            </h3>
          </div>
          <PaginatedTable<WarehouseStock>
            columns={stockColumns}
            fetchUrl={`/warehouses/${viewingWarehouse.id}/stocks`}
            searchPlaceholder="Search stock by item name or SKU..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1F2839' }}>Warehouses</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B5B8BF' }}>
            Manage warehouse hubs, regional settings, locations, and inventory levels.
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
            Add Warehouse
          </button>
        </div>
      </div>

      <div className="content-card" style={{ padding: 0 }}>
        <PaginatedTable<Warehouse>
          columns={listColumns}
          fetchUrl="/warehouses"
          searchPlaceholder="Search warehouses by name, city, or location..."
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
              {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
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
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                    City Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cityCode}
                    onChange={(e) => setFormData({ ...formData, cityCode: e.target.value })}
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
                  Location Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
export default Warehouses;

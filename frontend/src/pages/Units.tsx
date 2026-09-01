import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Edit2, PowerOff } from 'lucide-react';
import { Button, Input, FormField, Modal, StatusBadge, PageHeader } from '../components/ui/index.js';

interface Unit {
  id: number;
  name: string;
  symbol: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Units = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openModal = (unit?: Unit) => {
    setErrorMsg(null);
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        symbol: unit.symbol || '',
        description: unit.description || '',
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: '',
        symbol: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name,
        symbol: formData.symbol || undefined,
        description: formData.description || undefined,
      };

      if (editingUnit) {
        await apiClient.request(`/units/${editingUnit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/units', payload);
      }

      setRefreshKey((k) => k + 1);
      closeModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the unit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (unit: Unit) => {
    if (!window.confirm(`Are you sure you want to deactivate unit "${unit.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/units/${unit.id}/deactivate`);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate unit');
    }
  };

  const columns: Column<Unit>[] = [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Symbol', key: 'symbol', render: (item) => item.symbol || '-' },
    { header: 'Description', key: 'description', render: (item) => item.description || '-' },
    {
      header: 'Status',
      key: 'isActive',
      render: (item) => (
        <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="icon" onClick={() => openModal(item)} title="Edit Unit"><Edit2 size={16} /></Button>
          {item.isActive && (
            <Button variant="icon" onClick={() => handleDeactivate(item)} title="Deactivate Unit" style={{ color: "#EF4444" }}><PowerOff size={16} /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <PageHeader
        title="Units"
        description="Manage units of measurement (UoM) for inventory items."
        actions={
          <>
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
            <Button variant="primary" onClick={() => openModal()}>
              Add Unit
            </Button>
          </>
        }
      />

      <div className="content-card" style={{ padding: 0 }}>
        <PaginatedTable<Unit>
          columns={columns}
          fetchUrl="/units"
          searchPlaceholder="Search units by name or symbol..."
          extraParams={{
            refreshKey,
            status: statusFilter,
          }}
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUnit ? 'Edit Unit' : 'Add Unit'} width="400px">
        {errorMsg && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>
          
          <FormField label="Symbol">
            <Input
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            />
          </FormField>
          
          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </FormField>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Item {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  unitId: number;
  unit?: { id: number; name: string; symbol: string | null };
  trackingType: 'BULK' | 'SERIALIZED';
  isActive: boolean;
}

export interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  onSuccess: () => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [units, setUnits] = useState<{ id: number; name: string; symbol: string | null }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    modelNumber: '',
    unitId: '',
    trackingType: 'BULK' as 'BULK' | 'SERIALIZED',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res: any = await apiClient.get('/units', { params: { limit: 100, status: 'active' } });
        setUnits(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load active units:', err);
      }
    };
    if (isOpen) {
      fetchUnits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        brand: item.brand || '',
        modelNumber: item.modelNumber || '',
        unitId: String(item.unitId || ''),
        trackingType: item.trackingType || 'BULK',
      });
    } else {
      setFormData({
        name: '',
        brand: '',
        modelNumber: '',
        unitId: '',
        trackingType: 'BULK',
      });
    }
    setErrorMsg(null);
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        modelNumber: formData.modelNumber.trim() || undefined,
        unitId: parseInt(formData.unitId, 10),
      };

      if (!item) {
        payload.trackingType = formData.trackingType;
      } else if (item.trackingType !== formData.trackingType) {
        payload.trackingType = formData.trackingType;
      }

      if (item) {
        await apiClient.request(`/items/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/items', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the item');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Edit Master Item' : 'Add Master Item'}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Item Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Radio Base Station OSDR-10-L-0350"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Brand / Manufacturer" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. Intracom, HPE, Cisco"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </FormField>

            <FormField label="Model Number / MN" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. OSDR-10-L-0350"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Unit of Measurement" required style={{ marginBottom: 0 }}>
              <Select
                required
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              >
                <option value="">-- Select Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.symbol ? `(${u.symbol})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tracking Type" required style={{ marginBottom: 0 }}>
              <Select
                value={formData.trackingType}
                onChange={(e) =>
                  setFormData({ ...formData, trackingType: e.target.value as 'BULK' | 'SERIALIZED' })
                }
              >
                <option value="BULK">Bulk (Qty only)</option>
                <option value="SERIALIZED">Serialized (SN Tracked)</option>
              </Select>
            </FormField>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

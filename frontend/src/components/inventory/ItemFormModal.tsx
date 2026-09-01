import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Item {
  id: number;
  name: string;
  brand: string | null;
  unitId: number;
  unit?: { id: number; name: string };
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
  const [units, setUnits] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    unitId: '',
    trackingType: 'BULK' as 'BULK' | 'SERIALIZED',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res: any = await apiClient.get('/units', { params: { limit: 100, status: 'active' } });
        if (res && res.data) {
          setUnits(res.data);
        }
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
        unitId: String(item.unitId || ''),
        trackingType: item.trackingType || 'BULK',
      });
    } else {
      setFormData({
        name: '',
        brand: '',
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
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Item Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Cisco Switch 24-Port"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Brand / Manufacturer">
            <Input
              type="text"
              placeholder="e.g. Cisco, Ubiquiti, Schneider"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </FormField>

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
                    {u.name}
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

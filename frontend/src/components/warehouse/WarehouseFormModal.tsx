import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Warehouse {
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

export interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse?: Warehouse | null;
  onSuccess: () => void;
}

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    cityCode: '',
    location: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name,
        city: warehouse.city,
        cityCode: warehouse.cityCode,
        location: warehouse.location,
        description: warehouse.description || '',
      });
    } else {
      setFormData({
        name: '',
        city: '',
        cityCode: '',
        location: '',
        description: '',
      });
    }
    setErrorMsg(null);
  }, [warehouse, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        location: formData.location.trim(),
        description: formData.description.trim() || undefined,
      };

      if (warehouse) {
        await apiClient.request(`/warehouses/${warehouse.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/warehouses', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the warehouse');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={warehouse ? 'Edit Warehouse' : 'Add Warehouse'}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Warehouse Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Main Central Hub"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="City" required style={{ marginBottom: 0 }}>
              <Input
                type="text"
                required
                placeholder="e.g. Jakarta"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </FormField>

            <FormField label="City Code" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                disabled
                value={warehouse ? formData.cityCode : 'Generated automatically'}
              />
            </FormField>
          </div>

          <FormField label="Location Address" required>
            <Input
              type="text"
              required
              placeholder="e.g. Jl. Industri No. 12"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              placeholder="Optional notes or operational details"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </FormField>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {warehouse ? 'Save Changes' : 'Add Warehouse'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

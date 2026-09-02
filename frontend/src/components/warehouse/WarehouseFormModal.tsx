import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Warehouse {
  id: number;
  name: string;
  city: string;
  cityCode: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CityOption {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
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
  const [cities, setCities] = useState<CityOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    cityCode: '',
    location: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res: any = await apiClient.get('/cities', { params: { status: 'active', limit: 100 } });
        setCities(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load active cities:', err);
      }
    };

    if (isOpen) {
      fetchCities();
      if (warehouse) {
        setFormData({
          name: warehouse.name,
          city: warehouse.city,
          cityCode: warehouse.cityCode,
          location: warehouse.location,
        });
      } else {
        setFormData({
          name: '',
          city: '',
          cityCode: '',
          location: '',
        });
      }
      setErrorMsg(null);
    }
  }, [warehouse, isOpen]);

  const handleCitySelect = (cityName: string) => {
    const matched = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    setFormData((prev) => ({
      ...prev,
      city: cityName,
      cityCode: matched ? matched.code : prev.cityCode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        location: formData.location.trim(),
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
          {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

          <FormField label="Warehouse Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Main Balikpapan Hub"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="City" required style={{ marginBottom: 0 }}>
              <Select
                required
                value={formData.city}
                onChange={(e) => handleCitySelect(e.target.value)}
              >
                <option value="">Select configured City...</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="City Code (Derived)" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                disabled
                value={formData.cityCode || (warehouse ? warehouse.cityCode : 'Auto-derived')}
                style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#F3F4F6' }}
              />
            </FormField>
          </div>

          <FormField label="Location Address (Full Physical Street Address)" required>
            <Input
              type="text"
              required
              placeholder="e.g. Jl. Mulawarman No. 88, Balikpapan"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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

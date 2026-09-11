import React, { useState, useEffect, useRef } from 'react';
import { Modal, FormField, Input, Select, Button, ConfirmModal } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';

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
  const { showToast } = useToast();
  const [cities, setCities] = useState<CityOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    cityCode: '',
    location: '',
  });
  const [hasCustomName, setHasCustomName] = useState(false);
  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

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
        const init = {
          name: warehouse.name,
          city: warehouse.city,
          cityCode: warehouse.cityCode,
          location: warehouse.location || '',
        };
        setFormData(init);
        setInitialData(init);
        setHasCustomName(true);
      } else {
        const init = {
          name: '',
          city: '',
          cityCode: '',
          location: '',
        };
        setFormData(init);
        setInitialData(init);
        setHasCustomName(false);
      }
      setErrorMsg(null);

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, warehouse]);

  const handleCityChange = (cityName: string) => {
    const selectedCity = cities.find((c) => c.name === cityName);
    const newCityCode = selectedCity ? selectedCity.code : '';
    
    // Auto-suggest "[City Name] Warehouse" if not manually customized
    const suggestedName = !hasCustomName && cityName ? `${cityName} Warehouse` : formData.name;

    setFormData({
      ...formData,
      city: cityName,
      cityCode: newCityCode,
      name: suggestedName,
    });
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city.trim() || !formData.location.trim()) {
      setErrorMsg('Warehouse Name, City, and Location are required');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (warehouse) {
        await apiClient.patch(`/warehouses/${warehouse.id}`, {
          name: formData.name.trim(),
          city: formData.city.trim(),
          location: formData.location.trim(),
        });
        showToast({ type: 'success', message: `Warehouse "${formData.name}" updated successfully` });
      } else {
        await apiClient.post('/warehouses', {
          name: formData.name.trim(),
          city: formData.city.trim(),
          location: formData.location.trim(),
        });
        showToast({ type: 'success', message: `Warehouse "${formData.name}" created successfully` });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save warehouse';
      setErrorMsg(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={warehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2839' }}>
                  City *
                </label>
                {formData.cityCode && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#EFF6FF',
                      color: '#2250A1',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    Code: {formData.cityCode}
                  </span>
                )}
              </div>
              <Select
                required
                value={formData.city}
                onChange={(e) => handleCityChange(e.target.value)}
              >
                <option value="">Select City...</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </Select>
            </div>

            <FormField label="Warehouse Name" required>
              <Input
                ref={nameInputRef}
                placeholder="e.g. Balikpapan Central Warehouse"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setHasCustomName(true);
                }}
              />
            </FormField>

            <FormField label="Full Location / Address" required>
              <Input
                placeholder="e.g. Jl. Mulawarman No. 45, Sepinggan"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </FormField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {warehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this form. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        variant="danger"
      />
    </>
  );
};

export default WarehouseFormModal;

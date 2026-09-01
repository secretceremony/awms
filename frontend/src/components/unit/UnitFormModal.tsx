import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Unit {
  id: number;
  name: string;
  symbol: string | null;
  description: string | null;
  isActive: boolean;
}

export interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: Unit | null;
  onSuccess: () => void;
}

export const UnitFormModal: React.FC<UnitFormModalProps> = ({
  isOpen,
  onClose,
  unit,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name,
        symbol: unit.symbol || '',
        description: unit.description || '',
      });
    } else {
      setFormData({
        name: '',
        symbol: '',
        description: '',
      });
    }
    setErrorMsg(null);
  }, [unit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        symbol: formData.symbol.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      if (unit) {
        await apiClient.request(`/units/${unit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/units', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the unit');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={unit ? 'Edit Unit' : 'Add Unit'}
      maxWidth="460px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Unit Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Kilogram, Meter, Pieces"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Symbol">
            <Input
              type="text"
              placeholder="e.g. kg, m, pcs"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            />
          </FormField>

          <FormField label="Description">
            <Input
              type="text"
              placeholder="Optional description"
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
            {unit ? 'Save Changes' : 'Add Unit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

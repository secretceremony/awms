import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name,
        symbol: unit.symbol || '',
      });
    } else {
      setFormData({
        name: '',
        symbol: '',
      });
    }
    setErrorMsg(null);
  }, [unit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    const name = formData.name.trim();
    const symbol = formData.symbol.trim().toLowerCase();

    try {
      const payload = {
        name,
        symbol,
      };

      if (unit) {
        await apiClient.request(`/units/${unit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast({ type: 'success', message: `Unit "${name}" updated successfully` });
      } else {
        await apiClient.post('/units', payload);
        showToast({ type: 'success', message: `Unit "${name}" created successfully` });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'An error occurred while saving the unit';
      setErrorMsg(msg);
      showToast({ type: 'error', message: msg });
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
        <Modal.Body>
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Unit Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Meter, Pieces, Set"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Symbol (Normalized lowercase)" required>
            <Input
              type="text"
              required
              placeholder="e.g. m, pcs, set, roll"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toLowerCase() })}
            />
          </FormField>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {unit ? 'Save Changes' : 'Add Unit'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

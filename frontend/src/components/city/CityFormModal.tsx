import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';

export interface City {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface CityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  city?: City | null;
  onSuccess: () => void;
}

export const CityFormModal: React.FC<CityFormModalProps> = ({
  isOpen,
  onClose,
  city,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (city) {
        setName(city.name);
        setCode(city.code);
      } else {
        setName('');
        setCode('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCode = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(trimmedCode)) {
      setErrorMsg('City code must be exactly 3 uppercase letters (e.g. BPN, JKT).');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: trimmedCode,
      };

      if (city) {
        await apiClient.patch(`/cities/${city.id}`, payload);
        showToast({ type: 'success', message: `City "${payload.name}" updated successfully` });
      } else {
        await apiClient.post('/cities', payload);
        showToast({ type: 'success', message: `City "${payload.name}" created successfully` });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save city configuration';
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
      title={city ? 'Edit City Configuration' : 'Add New City'}
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

          <FormField label="City Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Balikpapan / Jakarta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField label="City Code (3 Uppercase Letters)" required>
            <Input
              type="text"
              required
              maxLength={3}
              placeholder="e.g. BPN"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
            />
          </FormField>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {city ? 'Save Changes' : 'Create City'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

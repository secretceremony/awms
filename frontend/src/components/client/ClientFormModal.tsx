import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface ClientContact {
  id: number;
  clientId: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string; // Company Name
  clientType: 'PHM' | 'OTHER';
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  contacts?: ClientContact[];
  _count?: {
    projects: number;
    contacts: number;
  };
}

export interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onSuccess: () => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  client,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    clientType: 'OTHER' as 'PHM' | 'OTHER',
    email: '',
    phone: '',
    address: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        clientType: client.clientType || 'OTHER',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
      });
    } else {
      setFormData({
        name: '',
        clientType: 'OTHER',
        email: '',
        phone: '',
        address: '',
      });
    }
    setErrorMsg(null);
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        clientType: formData.clientType,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      if (client) {
        await apiClient.request(`/clients/${client.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/clients', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the client');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Edit Client' : 'Add New Client'}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Company Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. PT Pertamina Hulu Mahakam"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Client Type" required>
            <Select
              value={formData.clientType}
              onChange={(e) =>
                setFormData({ ...formData, clientType: e.target.value as 'PHM' | 'OTHER' })
              }
            >
              <option value="PHM">PHM (Pertamina-related)</option>
              <option value="OTHER">OTHER (Other Clients)</option>
            </Select>
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Email" style={{ marginBottom: 0 }}>
              <Input
                type="email"
                placeholder="e.g. contact@client.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>

            <FormField label="Phone" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. +62 812-3456-7890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Address">
            <Textarea
              placeholder="Full office address or site location"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </FormField>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {client ? 'Save Changes' : 'Add Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

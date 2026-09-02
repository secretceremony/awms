import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Customer {
  id: number;
  name: string; // Company Name
  code: string | null;
  attnName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSuccess: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    attnName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        code: customer.code || '',
        attnName: customer.attnName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        attnName: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setErrorMsg(null);
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        attnName: formData.attnName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      if (customer) {
        await apiClient.request(`/customers/${customer.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/customers', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit User / Company' : 'Add New User / Company'}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Company Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. PT Telekomunikasi Selular"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <div className="form-grid">
            <FormField label="User Code">
              <Input
                type="text"
                placeholder="e.g. TELKOMSEL"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </FormField>

            <FormField label="Attn / PIC">
              <Input
                type="text"
                placeholder="e.g. Budi Santoso"
                value={formData.attnName}
                onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-grid">
            <FormField label="Email Address">
              <Input
                type="email"
                placeholder="e.g. contact@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>

            <FormField label="Phone Number">
              <Input
                type="text"
                placeholder="e.g. +62 812-3456-7890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Office / Site Address">
            <Textarea
              rows={3}
              placeholder="Street address, building, floor..."
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
            {customer ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

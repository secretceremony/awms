import React, { useState, useEffect, useRef } from 'react';
import { Modal, FormField, Input, Textarea, Button, SegmentedControl, ConfirmModal } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { User } from 'lucide-react';

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
    // Optional first contact (for create only)
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  });

  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = client
        ? {
            name: client.name,
            clientType: client.clientType || 'OTHER',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
          }
        : {
            name: '',
            clientType: 'OTHER' as 'PHM' | 'OTHER',
            email: '',
            phone: '',
            address: '',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
          };

      setFormData(initial);
      setInitialData(initial);
      setErrorMsg(null);

      // Auto-focus first field
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, client]);

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
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        name: formData.name.trim(),
        clientType: formData.clientType,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      if (!client && formData.contactName.trim()) {
        payload.primaryContact = {
          name: formData.contactName.trim(),
          phone: formData.contactPhone.trim() || undefined,
          email: formData.contactEmail.trim() || undefined,
        };
      }

      if (client) {
        await apiClient.patch(`/clients/${client.id}`, payload);
      } else {
        await apiClient.post('/clients', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={client ? 'Edit Client Details' : 'Add New Client'}
        maxWidth="580px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Client Company Info */}
            <div style={{ marginBottom: '1rem' }}>
              <FormField label="Company Name" required>
                <Input
                  ref={nameInputRef}
                  placeholder="e.g. PT Pertamina Hulu Mahakam"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormField>

              <FormField label="Client Type" required>
                <SegmentedControl<'PHM' | 'OTHER'>
                  value={formData.clientType}
                  onChange={(val) => setFormData({ ...formData, clientType: val })}
                  options={[
                    { value: 'PHM', label: 'PHM (Pertamina Hulu Mahakam)' },
                    { value: 'OTHER', label: 'Other Client' },
                  ]}
                />
              </FormField>

              <div className="form-grid">
                <FormField label="Company Phone">
                  <Input
                    placeholder="e.g. 0542-123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </FormField>

                <FormField label="Company Email">
                  <Input
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Office Address">
                <Textarea
                  placeholder="Street address, city, building..."
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </FormField>
            </div>

            {/* Optional Primary Contact Person (Create Only) */}
            {!client && (
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  backgroundColor: '#F8FAFC',
                  marginTop: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <User size={15} color="#2250A1" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B' }}>
                    Primary Contact Person (Optional)
                  </span>
                </div>

                <FormField label="Attn / PIC Name" style={{ marginBottom: '8px' }}>
                  <Input
                    placeholder="e.g. Budi Santoso"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </FormField>

                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <FormField label="Contact Phone" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="e.g. 08123456789"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Contact Email" style={{ marginBottom: 0 }}>
                    <Input
                      type="email"
                      placeholder="pic@company.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {client ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Discard Confirmation Modal */}
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

export default ClientFormModal;

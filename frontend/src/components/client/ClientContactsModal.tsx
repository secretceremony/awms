import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Button, StatusBadge } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import type { Client, ClientContact } from './ClientFormModal.js';
import { Plus, Edit2, Ban, CheckCircle, Trash2, User } from 'lucide-react';

export interface ClientContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onUpdate: () => void;
}

export const ClientContactsModal: React.FC<ClientContactsModalProps> = ({
  isOpen,
  onClose,
  client,
  onUpdate,
}) => {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state for adding/editing contact
  const [isEditing, setIsEditing] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchContacts = async () => {
    if (!client) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get<ClientContact[]>(`/clients/${client.id}/contacts`);
      setContacts(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && client) {
      fetchContacts();
      setIsEditing(false);
      setEditingContact(null);
    }
  }, [isOpen, client]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleOpenEdit = (contact: ClientContact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactEmail(contact.email || '');
    setContactPhone(contact.phone || '');
    setIsEditing(true);
    setErrorMsg(null);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: contactName.trim(),
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      };

      if (editingContact) {
        await apiClient.request(`/clients/${client.id}/contacts/${editingContact.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post(`/clients/${client.id}/contacts`, payload);
      }

      setIsEditing(false);
      setEditingContact(null);
      await fetchContacts();
      onUpdate();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (contact: ClientContact) => {
    if (!client) return;
    setErrorMsg(null);
    try {
      const action = contact.isActive ? 'deactivate' : 'reactivate';
      await apiClient.request(`/clients/${client.id}/contacts/${contact.id}/${action}`, {
        method: 'PATCH',
      });
      await fetchContacts();
      onUpdate();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update contact status');
    }
  };

  const handleDeleteContact = async (contact: ClientContact) => {
    if (!client) return;
    if (!window.confirm(`Are you sure you want to delete contact "${contact.name}"?`)) {
      return;
    }
    setErrorMsg(null);
    try {
      await apiClient.delete(`/clients/${client.id}/contacts/${contact.id}`);
      await fetchContacts();
      onUpdate();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete contact');
    }
  };

  if (!client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contacts — ${client.name}`}
      maxWidth="650px"
    >
      <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

        {!isEditing ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                Contact persons for delivery order Attn & logistics requests.
              </div>
              <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                <Plus size={14} /> Add Contact
              </Button>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: '#F9FAFB', borderRadius: '8px', border: '1px dashed #E5E7EB' }}>
                <User size={32} style={{ color: '#9CA3AF', marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, color: '#374151' }}>No Contacts Yet</div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Click "Add Contact" above to add contact persons for this client.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: contact.isActive ? '#FFFFFF' : '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      opacity: contact.isActive ? 1 : 0.75,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#1F2839' }}>{contact.name}</span>
                        <StatusBadge status={contact.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                        {contact.email && <span>{contact.email}</span>}
                        {contact.email && contact.phone && <span> &bull; </span>}
                        {contact.phone && <span>{contact.phone}</span>}
                        {!contact.email && !contact.phone && <span>No contact info provided</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(contact)} title="Edit Contact">
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(contact)}
                        title={contact.isActive ? 'Deactivate Contact' : 'Reactivate Contact'}
                        style={{ color: contact.isActive ? '#EF4444' : '#10B981' }}
                      >
                        {contact.isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContact(contact)}
                        title="Delete Contact"
                        style={{ color: '#6B7280' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveContact}>
            <div style={{ fontWeight: 600, marginBottom: '1rem', color: '#1F2839' }}>
              {editingContact ? 'Edit Contact Person' : 'Add Contact Person'}
            </div>

            <FormField label="Contact Person Name (Attn)" required>
              <Input
                type="text"
                required
                placeholder="e.g. John Doe / Budi Santoso"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </FormField>

            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Email" style={{ marginBottom: 0 }}>
                <Input
                  type="email"
                  placeholder="e.g. john@pertamina.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </FormField>

              <FormField label="Phone" style={{ marginBottom: 0 }}>
                <Input
                  type="text"
                  placeholder="e.g. +62 812-3456-7890"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </FormField>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
              <Button variant="secondary" type="button" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Back to Contacts
              </Button>
              <Button variant="primary" type="submit" isLoading={isSaving}>
                {editingContact ? 'Save Contact' : 'Add Contact'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="modal-footer">
        <Button variant="secondary" type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

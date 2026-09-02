import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Project {
  id: number;
  clientId: number;
  client?: { id: number; name: string };
  clientContactId: number | null;
  clientContact?: { id: number; name: string; email?: string | null; phone?: string | null };
  referenceNumber: string | null;
  name: string;
  location: string;
  siteCode: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  startedAt: string | null;
  endedAt: string | null;
}

export interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onSuccess: () => void;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  project,
  onSuccess,
}) => {
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: number; name: string; email?: string | null; phone?: string | null }[]>([]);
  const [formData, setFormData] = useState({
    clientId: '',
    clientContactId: '',
    name: '',
    referenceNumber: '',
    location: '',
    siteCode: '',
    startedAt: '',
    endedAt: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch active clients on open
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res: any = await apiClient.get('/clients', { params: { limit: 100, status: 'active' } });
        setClients(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load active clients:', err);
      }
    };
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  // Fetch contacts whenever selected clientId changes
  useEffect(() => {
    const fetchContacts = async () => {
      if (!formData.clientId) {
        setContacts([]);
        return;
      }
      try {
        const res: any = await apiClient.get(`/clients/${formData.clientId}/contacts`, {
          params: { status: 'active' },
        });
        setContacts(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load client contacts:', err);
        setContacts([]);
      }
    };
    if (isOpen && formData.clientId) {
      fetchContacts();
    }
  }, [formData.clientId, isOpen]);

  useEffect(() => {
    if (project) {
      setFormData({
        clientId: String(project.clientId || ''),
        clientContactId: project.clientContactId ? String(project.clientContactId) : '',
        name: project.name || '',
        referenceNumber: project.referenceNumber || '',
        location: project.location || '',
        siteCode: project.siteCode || '',
        startedAt: project.startedAt ? project.startedAt.split('T')[0] : '',
        endedAt: project.endedAt ? project.endedAt.split('T')[0] : '',
      });
    } else {
      setFormData({
        clientId: '',
        clientContactId: '',
        name: '',
        referenceNumber: '',
        location: '',
        siteCode: '',
        startedAt: '',
        endedAt: '',
      });
    }
    setErrorMsg(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.clientId) {
      setErrorMsg('Client is required');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMsg('Project Name is required');
      return;
    }
    if (!formData.location.trim()) {
      setErrorMsg('Location is required');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        clientId: parseInt(formData.clientId, 10),
        clientContactId: formData.clientContactId ? parseInt(formData.clientContactId, 10) : undefined,
        name: formData.name.trim(),
        referenceNumber: formData.referenceNumber.trim() || undefined,
        location: formData.location.trim(),
        siteCode: formData.siteCode.trim() || undefined,
        startedAt: formData.startedAt || undefined,
        endedAt: formData.endedAt || undefined,
      };

      if (project) {
        await apiClient.request(`/projects/${project.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/projects', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Edit Project' : 'Add New Project'}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Client (Company)" required>
            <Select
              required
              value={formData.clientId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  clientId: e.target.value,
                  clientContactId: '', // reset contact if client changes
                })
              }
            >
              <option value="">Select a Client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Attn / Client Contact (Optional)">
            <Select
              value={formData.clientContactId}
              onChange={(e) => setFormData({ ...formData, clientContactId: e.target.value })}
              disabled={!formData.clientId || contacts.length === 0}
            >
              <option value="">
                {!formData.clientId
                  ? 'Select Client first'
                  : contacts.length === 0
                  ? 'No contacts registered for this client'
                  : 'Select Contact Person (Attn)...'}
              </option>
              {contacts.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name} {ct.email ? `(${ct.email})` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Project Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Balikpapan Port Expansion 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Reference Number (PO / Contract No.)" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. PO-2026-001 or CTR-089"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Site Code (Optional)" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. CPA, MTGU, EAST MANDU"
                value={formData.siteCode}
                onChange={(e) => setFormData({ ...formData, siteCode: e.target.value.toUpperCase() })}
              />
            </FormField>
          </div>

          <FormField label="Location (Deployment Site / Address)" required>
            <Input
              type="text"
              required
              placeholder="e.g. Central Processing Area, Handil II"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Start Date" style={{ marginBottom: 0 }}>
              <Input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
              />
            </FormField>

            <FormField label="End Date" style={{ marginBottom: 0 }}>
              <Input
                type="date"
                value={formData.endedAt}
                onChange={(e) => setFormData({ ...formData, endedAt: e.target.value })}
              />
            </FormField>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

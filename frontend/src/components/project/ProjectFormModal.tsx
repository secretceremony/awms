import React, { useState, useEffect, useRef } from 'react';
import { Modal, FormField, Input, Select, Button, ConfirmModal } from '../ui/index.js';
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
    startedAt: new Date().toISOString().split('T')[0],
    endedAt: '',
  });

  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientSelectRef = useRef<HTMLSelectElement>(null);

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

  // Fetch contacts whenever selected clientId changes and auto-select single active contact
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
        const activeContacts: any[] = Array.isArray(res) ? res : res?.data || [];
        setContacts(activeContacts);

        // Rule 7: If exactly ONE active contact exists, auto-select it
        if (!project && activeContacts.length === 1) {
          setFormData((prev) => ({
            ...prev,
            clientContactId: String(activeContacts[0].id),
          }));
        }
      } catch (err) {
        console.error('Failed to load client contacts:', err);
        setContacts([]);
      }
    };
    if (isOpen && formData.clientId) {
      fetchContacts();
    }
  }, [formData.clientId, isOpen, project]);

  useEffect(() => {
    if (isOpen) {
      const initial = project
        ? {
            clientId: String(project.clientId || ''),
            clientContactId: project.clientContactId ? String(project.clientContactId) : '',
            name: project.name || '',
            referenceNumber: project.referenceNumber || '',
            location: project.location || '',
            siteCode: project.siteCode || '',
            startedAt: project.startedAt ? project.startedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            endedAt: project.endedAt ? project.endedAt.split('T')[0] : '',
          }
        : {
            clientId: '',
            clientContactId: '',
            name: '',
            referenceNumber: '',
            location: '',
            siteCode: '',
            startedAt: new Date().toISOString().split('T')[0],
            endedAt: '',
          };

      setFormData(initial);
      setInitialData(initial);
      setErrorMsg(null);

      setTimeout(() => {
        clientSelectRef.current?.focus();
      }, 50);
    }
  }, [isOpen, project]);

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
    if (!formData.clientId) {
      setErrorMsg('Client is required');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMsg('Project Name is required');
      return;
    }
    if (!formData.location.trim()) {
      setErrorMsg('Site / Location is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        clientId: Number(formData.clientId),
        clientContactId: formData.clientContactId ? Number(formData.clientContactId) : null,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        location: formData.location.trim(),
        siteCode: formData.siteCode.trim().toUpperCase() || undefined,
        startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : undefined,
        endedAt: project && formData.endedAt ? new Date(formData.endedAt).toISOString() : undefined,
      };

      if (project) {
        await apiClient.patch(`/projects/${project.id}`, payload);
      } else {
        await apiClient.post('/projects', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={project ? 'Edit Project' : 'Create New Project'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div className="form-grid">
              <FormField label="Client / Company" required>
                <Select
                  ref={clientSelectRef}
                  required
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientId: e.target.value,
                      clientContactId: '',
                    })
                  }
                >
                  <option value="">Select Client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Attn / Client Contact">
                <Select
                  disabled={!formData.clientId || contacts.length === 0}
                  value={formData.clientContactId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientContactId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    {contacts.length === 0 ? 'No contacts available' : 'Select Contact Person...'}
                  </option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.phone ? `(${contact.phone})` : ''}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Project Name" required>
              <Input
                placeholder="e.g. Pipeline Maintenance Phase 2"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>

            <div className="form-grid">
              <FormField label="Reference Number (PO / Contract)">
                <Input
                  placeholder="e.g. PO-PHM-2026-001 (Optional)"
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceNumber: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Site Code">
                <Input
                  placeholder="e.g. CPA, MTGU, Site 1"
                  value={formData.siteCode}
                  onChange={(e) =>
                    setFormData({ ...formData, siteCode: e.target.value.toUpperCase() })
                  }
                />
              </FormField>
            </div>

            <FormField label="Site / Location Address" required>
              <Input
                placeholder="e.g. Sanga-Sanga Field, Handil 2"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </FormField>

            <div className="form-grid">
              <FormField label="Start Date">
                <Input
                  type="date"
                  value={formData.startedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, startedAt: e.target.value })
                  }
                />
              </FormField>

              {/* End Date is HIDDEN during project creation, only shown during Edit */}
              {project && (
                <FormField label="End Date">
                  <Input
                    type="date"
                    value={formData.endedAt}
                    onChange={(e) =>
                      setFormData({ ...formData, endedAt: e.target.value })
                    }
                  />
                </FormField>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {project ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
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

export default ProjectFormModal;

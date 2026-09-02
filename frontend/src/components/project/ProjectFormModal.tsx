import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Project {
  id: number;
  customerId: number;
  customer?: { id: number; name: string };
  referenceNumber: string | null;
  name: string;
  location: string;
  attnName: string | null;
  leaderName: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  isActive: boolean;
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
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    name: '',
    referenceNumber: '',
    location: '',
    attnName: '',
    leaderName: '',
    status: 'ACTIVE',
    startedAt: '',
    endedAt: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res: any = await apiClient.get('/customers', { params: { limit: 100, status: 'active' } });
        setCustomers(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load active users:', err);
      }
    };
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (project) {
      setFormData({
        customerId: String(project.customerId || ''),
        name: project.name || '',
        referenceNumber: project.referenceNumber || '',
        location: project.location || '',
        attnName: project.attnName || '',
        leaderName: project.leaderName || '',
        status: project.status || 'ACTIVE',
        startedAt: project.startedAt ? project.startedAt.split('T')[0] : '',
        endedAt: project.endedAt ? project.endedAt.split('T')[0] : '',
      });
    } else {
      setFormData({
        customerId: '',
        name: '',
        referenceNumber: '',
        location: '',
        attnName: '',
        leaderName: '',
        status: 'ACTIVE',
        startedAt: '',
        endedAt: '',
      });
    }
    setErrorMsg(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.customerId) {
      setErrorMsg('User / Company is required');
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
        customerId: parseInt(formData.customerId, 10),
        name: formData.name.trim(),
        referenceNumber: formData.referenceNumber.trim() || undefined,
        location: formData.location.trim(),
        attnName: formData.attnName.trim() || undefined,
        leaderName: formData.leaderName.trim() || undefined,
        status: formData.status,
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
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="User / Company" required style={{ marginBottom: 0 }}>
              <Select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              >
                <option value="">-- Select User / Company --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Project Status" style={{ marginBottom: 0 }}>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Project Name" required>
            <Input
              type="text"
              required
              placeholder="e.g. Site Expansion Phase 1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Reference Number (PO / Contract No.)" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. PO-2026-001 or CTR-998"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Location / Site" required style={{ marginBottom: 0 }}>
              <Input
                type="text"
                required
                placeholder="e.g. Balikpapan Site 1"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Attn / PIC" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. Budi Santoso"
                value={formData.attnName}
                onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
              />
            </FormField>

            <FormField label="Project Leader" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                placeholder="e.g. Andi Wijaya"
                value={formData.leaderName}
                onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-grid">
            <FormField label="Start Date">
              <Input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
              />
            </FormField>

            <FormField label="End Date">
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

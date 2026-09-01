import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export interface Project {
  id: number;
  customerId: number;
  customer?: { id: number; name: string };
  jobNo: string;
  name: string;
  location: string | null;
  status: string;
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
    jobNo: '',
    name: '',
    location: '',
    status: 'ACTIVE',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res: any = await apiClient.get('/customers', { params: { limit: 100, status: 'active' } });
        setCustomers(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load active customers:', err);
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
        jobNo: project.jobNo || '',
        name: project.name || '',
        location: project.location || '',
        status: project.status || 'ACTIVE',
      });
    } else {
      setFormData({
        customerId: '',
        jobNo: '',
        name: '',
        location: '',
        status: 'ACTIVE',
      });
    }
    setErrorMsg(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        customerId: parseInt(formData.customerId, 10),
        jobNo: formData.jobNo.trim(),
        name: formData.name.trim(),
        location: formData.location.trim() || undefined,
        status: formData.status,
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
      title={project ? 'Edit Project' : 'Add Project'}
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Customer / Mitra" required>
            <Select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Job Number" required style={{ marginBottom: 0 }}>
              <Input
                type="text"
                required
                placeholder="e.g. JOB-2026-001"
                value={formData.jobNo}
                onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
              />
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

          <FormField label="Project Location">
            <Textarea
              placeholder="Deployment address or site details"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </FormField>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            {project ? 'Save Changes' : 'Add Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

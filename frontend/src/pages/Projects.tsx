import React, { useState } from 'react';
import {
  PageHeader,
  Button,
  Select,
  StatusBadge,
  ConfirmModal,
} from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { ProjectFormModal, type Project } from '../components/project/ProjectFormModal.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, CheckCircle2, RotateCcw, Trash2, MapPin, Building, User } from 'lucide-react';

export const Projects: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: 'danger' | 'primary' | 'warning';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedProject(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    if (project.status === 'COMPLETED') {
      alert('Completed projects are read-only. Reactivate the project to make edits.');
      return;
    }
    setSelectedProject(project);
    setIsFormModalOpen(true);
  };

  const handleCompleteProject = (project: Project, forceConfirm = false) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: forceConfirm ? '⚠️ Warning: Remaining Inventory on Project' : 'Complete Project',
      message: forceConfirm ? (
        <div>
          <p style={{ fontWeight: 600, color: '#B45309', marginBottom: '8px' }}>
            This project still has inventory assigned to it.
          </p>
          <p>
            Are you sure you want to mark "<strong>{project.name}</strong>" as Completed? Equipment can still be returned later, but no new dispatches will be permitted.
          </p>
        </div>
      ) : (
        `Mark project "${project.name}" as Completed? It will become read-only and close new outgoing dispatches.`
      ),
      confirmText: forceConfirm ? 'Yes, Complete Anyway' : 'Mark as Completed',
      variant: forceConfirm ? 'warning' : 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/projects/${project.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'COMPLETED',
              confirmRemainingStock: forceConfirm,
            }),
          });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          if (err.requiresConfirmation || err.message?.includes('still has inventory')) {
            handleCompleteProject(project, true);
          } else {
            setActionError(err.message || 'Failed to complete project');
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          }
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReactivate = (project: Project) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate Project',
      message: `Reactivate project "${project.name}" to ACTIVE status? This will allow new Delivery Orders and Outgoing dispatches.`,
      confirmText: 'Reactivate Project',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/projects/${project.id}/reactivate`, { method: 'PATCH' });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to reactivate project');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleDelete = (project: Project) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to permanently delete "${project.name}"? This action is only permitted if this project has NEVER been referenced in any transactional records.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/projects/${project.id}`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete project');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: 'Project Name',
      render: (project: Project) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{project.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: #{project.id}</span>
        </div>
      ),
    },
    {
      key: 'siteCode',
      header: 'Site Code',
      render: (project: Project) => (
        project.siteCode ? (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              color: '#0891B2',
              border: '1px solid rgba(6, 182, 212, 0.2)',
            }}
          >
            {project.siteCode}
          </span>
        ) : (
          <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>—</span>
        )
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (project: Project) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1F2839', fontWeight: 500 }}>
          <Building size={14} style={{ color: '#2250A1', flexShrink: 0 }} />
          <span>{project.client?.name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'clientContact',
      header: 'Attn / Contact',
      render: (project: Project) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
          <User size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <span>{project.clientContact?.name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference No.',
      render: (project: Project) => (
        project.referenceNumber ? (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1F2839' }}>
            {project.referenceNumber}
          </span>
        ) : (
          <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.8rem' }}>None</span>
        )
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (project: Project) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
          <MapPin size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.location}
          </span>
        </div>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      render: (project: Project) => (
        <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
          {project.startedAt ? new Date(project.startedAt).toLocaleDateString() : '—'} &rarr;{' '}
          {project.endedAt ? new Date(project.endedAt).toLocaleDateString() : 'Ongoing'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (project: Project) => (
        <StatusBadge
          status={project.status === 'COMPLETED' ? 'ARCHIVED' : 'ACTIVE'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (project: Project) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(project)}
            title={project.status === 'COMPLETED' ? 'Completed (Read-only)' : 'Edit Project'}
            disabled={project.status === 'COMPLETED'}
          >
            <Edit2 size={14} />
          </Button>
          {project.status === 'ACTIVE' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteProject(project)}
              title="Mark as Completed"
              style={{ color: '#10B981' }}
            >
              <CheckCircle2 size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(project)}
              title="Reactivate Project"
              style={{ color: '#2250A1' }}
            >
              <RotateCcw size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(project)}
            title="Delete Project"
            style={{ color: '#6B7280' }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Projects"
        description="Manage project deployments, client site codes, reference numbers, and timeline status"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Project
          </Button>
        }
      />

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          {actionError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ width: '180px' }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Archived / Completed</option>
          </Select>
        </div>
      </div>

      <PaginatedTable<Project>
        fetchUrl="/projects"
        searchPlaceholder="Search project name, site code, client, ref no, location..."
        columns={columns}
        extraParams={{
          status: statusFilter,
          _refresh: refreshTrigger,
        }}
      />

      <ProjectFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        project={selectedProject}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default Projects;

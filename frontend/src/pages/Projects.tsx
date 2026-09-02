import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Select,
  StatusBadge,
  ConfirmModal,
} from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { ProjectFormModal, type Project } from '../components/project/ProjectFormModal.js';
import { FilterBar, type ActiveFilter } from '../components/filters/index.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, CheckCircle2, RotateCcw, Trash2, MapPin, Building } from 'lucide-react';

export const Projects: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';

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

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    if (!('page' in updates)) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeFilters: ActiveFilter[] = [];
  if (statusFilter && statusFilter !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      valueDisplay: statusFilter.toUpperCase(),
      onClear: () => updateFilters({ status: null }),
    });
  }

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
      message: `Reactivate project "${project.name}"? This will allow new outgoing dispatches and editable project details.`,
      confirmText: 'Reactivate Project',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/projects/${project.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'ACTIVE' }),
          });
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
      message: `Are you sure you want to permanently delete project "${project.name}"? Deletion is only allowed if this project has NEVER had any dispatches, returns, or inventory assigned.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.request(`/projects/${project.id}`, { method: 'DELETE' });
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
      render: (p: Project) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{p.name}</span>
          {p.siteCode && (
            <span style={{ fontSize: '0.75rem', color: '#0891B2', fontWeight: 600 }}>
              Site: {p.siteCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (p: Project) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Building size={14} style={{ color: '#2250A1' }} />
          <span style={{ fontWeight: 600, color: '#1F2839' }}>
            {p.client ? p.client.name : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference No.',
      render: (p: Project) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            backgroundColor: p.referenceNumber ? 'rgba(34, 80, 161, 0.08)' : 'transparent',
            color: p.referenceNumber ? '#2250A1' : '#9CA3AF',
            border: p.referenceNumber ? '1px solid rgba(34, 80, 161, 0.2)' : 'none',
          }}
        >
          {p.referenceNumber || '—'}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location Address',
      render: (p: Project) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}>
          <MapPin size={14} style={{ color: '#2250A1', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem' }}>{p.location}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Primary PIC',
      render: (p: Project) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500, color: '#1F2839', fontSize: '0.85rem' }}>
            {p.clientContact?.name || '—'}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
            {p.clientContact?.phone || p.clientContact?.email || ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Project) => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: Project) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {p.status === 'ACTIVE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(p)}
              title="Edit Project"
            >
              <Edit2 size={14} />
            </Button>
          )}

          {p.status === 'ACTIVE' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteProject(p)}
              title="Complete Project"
              style={{ color: '#10B981' }}
            >
              <CheckCircle2 size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReactivate(p)}
              title="Reactivate Project"
              style={{ color: '#2250A1' }}
            >
              <RotateCcw size={14} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(p)}
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
        title="Project Management"
        description="Client operational contracts, site codes, assigned external reference numbers, and active dispatch locations"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Add Project
          </Button>
        }
      />

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
          {actionError}
        </div>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search project name, site code, reference no, or client..."
        primaryFilter={
          <div style={{ width: '160px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="COMPLETED">Completed Only</option>
            </Select>
          </div>
        }
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <PaginatedTable<Project>
        fetchUrl="/projects"
        searchPlaceholder="Search projects..."
        columns={columns}
        extraParams={{
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
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

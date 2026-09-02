import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import { Eye, Edit2, PowerOff, ArrowLeft, Plus } from 'lucide-react';
import { Button, StatusBadge, PageHeader, Select, ConfirmModal } from '../components/ui/index.js';
import { ProjectFormModal, type Project } from '../components/project/ProjectFormModal.js';

interface ProjectStock {
  itemId: number;
  itemName: string;
  brand: string;
  trackingType: 'BULK' | 'SERIALIZED';
  quantity: number;
  unit: string | null;
  symbol: string | null;
  serialNumbers?: string[];
}

export const Projects = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail View State
  const [viewingProject, setViewingProject] = useState<Project | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Confirm Deactivate State
  const [deactivatingProject, setDeactivatingProject] = useState<Project | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const openCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setIsModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivatingProject) return;
    setIsDeactivating(true);
    try {
      await apiClient.delete(`/projects/${deactivatingProject.id}/deactivate`);
      setRefreshKey((k) => k + 1);
      if (viewingProject?.id === deactivatingProject.id) {
        setViewingProject((prev) => (prev ? { ...prev, isActive: false } : null));
      }
      setDeactivatingProject(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to deactivate project');
    } finally {
      setIsDeactivating(false);
    }
  };

  const listColumns: Column<Project>[] = [
    {
      header: 'Project Name',
      key: 'name',
      render: (item) => <span style={{ fontWeight: 600, color: '#1F2839' }}>{item.name}</span>,
    },
    {
      header: 'User / Company',
      key: 'customer',
      render: (item) => item.customer?.name || '-',
    },
    {
      header: 'Reference No.',
      key: 'referenceNumber',
      render: (item) =>
        item.referenceNumber ? (
          <code>{item.referenceNumber}</code>
        ) : (
          <span style={{ color: '#9CA3AF' }}>-</span>
        ),
    },
    {
      header: 'Location',
      key: 'location',
      render: (item) => item.location || '-',
    },
    {
      header: 'Leader',
      key: 'leaderName',
      render: (item) => item.leaderName || '-',
    },
    {
      header: 'Attn / PIC',
      key: 'attnName',
      render: (item) => item.attnName || '-',
    },
    {
      header: 'Status',
      key: 'status',
      render: (item) => {
        const isActive = item.status === 'ACTIVE';
        return <StatusBadge status={isActive} label={item.status} />;
      },
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => setViewingProject(item)}
            title="View Details & Stock"
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => openEditModal(item)}
            title="Edit Project"
          >
            <Edit2 size={16} />
          </button>
          {item.isActive && (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setDeactivatingProject(item)}
              title="Deactivate Project"
            >
              <PowerOff size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const stockColumns: Column<ProjectStock>[] = [
    { header: 'Item Name', key: 'itemName' },
    { header: 'Brand', key: 'brand', render: (item) => item.brand || '-' },
    {
      header: 'Tracking Type',
      key: 'trackingType',
      render: (item) => (
        <StatusBadge type="tracking" status={item.trackingType} />
      ),
    },
    {
      header: 'Deployed Qty',
      key: 'quantity',
      render: (item) => `${item.quantity} ${item.symbol || item.unit || ''}`,
    },
    {
      header: 'Deployed Serials',
      key: 'serialNumbers',
      render: (item) => {
        if (item.trackingType !== 'SERIALIZED' || !item.serialNumbers?.length) {
          return '-';
        }
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
            {item.serialNumbers.map((sn, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  backgroundColor: '#F3F4F6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {sn}
              </span>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      {viewingProject ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingProject(null)}
            >
              <ArrowLeft size={16} /> Back to Projects List
            </Button>
          </div>

          <PageHeader
            title={viewingProject.name}
            description={`User / Company: ${viewingProject.customer?.name || '-'} • Reference: ${viewingProject.referenceNumber || 'N/A'} • Location: ${viewingProject.location || 'N/A'}`}
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <StatusBadge status={viewingProject.status === 'ACTIVE'} label={viewingProject.status} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(viewingProject)}
                >
                  <Edit2 size={14} /> Edit
                </Button>
                {viewingProject.isActive && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeactivatingProject(viewingProject)}
                  >
                    <PowerOff size={14} /> Deactivate
                  </Button>
                )}
              </div>
            }
          />

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2839', marginBottom: '16px' }}>
              Deployed Project Stock
            </h3>
            <PaginatedTable<ProjectStock>
              key={`project-stocks-${viewingProject.id}`}
              fetchUrl={`/projects/${viewingProject.id}/stocks`}
              searchPlaceholder="Search deployed items by name or brand..."
              columns={stockColumns}
            />
          </div>
        </div>
      ) : (
        <div>
          <PageHeader
            title="Projects"
            description="Manage client project deployments, reference numbers, and equipment tracking."
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Select
                  style={{ width: '130px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </Select>

                <Select
                  style={{ width: '140px' }}
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value)}
                >
                  <option value="all">All Lifecycle</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>

                <Button variant="primary" onClick={openCreateModal}>
                  <Plus size={16} /> Add Project
                </Button>
              </div>
            }
          />

          <PaginatedTable<Project>
            key={`projects-${statusFilter}-${projectStatusFilter}-${refreshKey}`}
            fetchUrl="/projects"
            searchPlaceholder="Search projects by name, reference no, user, or location..."
            extraParams={{
              status: statusFilter !== 'all' ? statusFilter : undefined,
              projectStatus: projectStatusFilter !== 'all' ? projectStatusFilter : undefined,
            }}
            columns={listColumns}
          />
        </div>
      )}

      {/* Form Modal */}
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={editingProject}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Confirm Deactivate Modal */}
      <ConfirmModal
        isOpen={!!deactivatingProject}
        onClose={() => setDeactivatingProject(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Project"
        message={`Are you sure you want to deactivate project "${deactivatingProject?.name}"?`}
        confirmText="Deactivate"
        isDestructive
        isLoading={isDeactivating}
      />
    </div>
  );
};

export default Projects;

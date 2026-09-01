import { useState } from 'react';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { apiClient } from '../api/client.js';
import {
  Eye,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Archive,
  RotateCcw,
  Boxes,
  Truck,
} from 'lucide-react';
import { Button, Input, Select, FormField, Modal, StatusBadge, PageHeader, Card } from '../components/ui/index.js';

interface CustomerOption {
  id: number;
  name: string;
  code: string | null;
  isActive: boolean;
}

interface ProjectStock {
  id: number;
  itemId: number;
  quantity: number;
  item: {
    id: number;
    name: string;
    brand: string;
    trackingType: 'SERIALIZED' | 'BULK';
    unit?: {
      name: string;
      symbol?: string;
    } | null;
  };
}

interface DeliveryOrderSummary {
  id: number;
  doNumber: string;
  date: string;
  status: string;
}

interface Project {
  id: number;
  name: string;
  jobNo: string | null;
  location: string;
  attnName: string | null;
  leaderName: string | null;
  activity: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  startedAt: string | null;
  endedAt: string | null;
  customerId: number | null;
  customer?: CustomerOption | null;
  projectStocks?: ProjectStock[];
  deliveryOrders?: DeliveryOrderSummary[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Projects = () => {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail View State
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    customerId: '',
    jobNo: '',
    attnName: '',
    leaderName: '',
    activity: '',
    startedAt: '',
    endedAt: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleViewProject = async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const data = await apiClient.get<Project>(`/projects/${id}`);
      setViewingProject(data);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setViewingProject(null);
  };

  // Fetch active customers for dropdown
  const loadCustomerOptions = async () => {
    try {
      const response = await apiClient.get<{ data: CustomerOption[] }>('/customers', {
        params: { status: 'active', limit: 100 },
      });
      if (Array.isArray(response)) {
        setCustomerOptions(response);
      } else if (response && Array.isArray((response as any).data)) {
        setCustomerOptions((response as any).data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const openModal = (proj?: Project) => {
    setErrorMsg(null);
    loadCustomerOptions();
    if (proj) {
      setEditingProject(proj);
      setFormData({
        name: proj.name,
        location: proj.location,
        customerId: proj.customerId ? String(proj.customerId) : '',
        jobNo: proj.jobNo || '',
        attnName: proj.attnName || '',
        leaderName: proj.leaderName || '',
        activity: proj.activity || '',
        startedAt: proj.startedAt ? proj.startedAt.split('T')[0] : '',
        endedAt: proj.endedAt ? proj.endedAt.split('T')[0] : '',
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        location: '',
        customerId: '',
        jobNo: '',
        attnName: '',
        leaderName: '',
        activity: '',
        startedAt: '',
        endedAt: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    if (formData.startedAt && formData.endedAt && formData.endedAt < formData.startedAt) {
      setErrorMsg('End date cannot be earlier than start date');
      setIsSaving(false);
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        customerId: formData.customerId ? Number(formData.customerId) : null,
        jobNo: formData.jobNo.trim() || undefined,
        attnName: formData.attnName.trim() || undefined,
        leaderName: formData.leaderName.trim() || undefined,
        activity: formData.activity.trim() || undefined,
        startedAt: formData.startedAt ? new Date(formData.startedAt).toISOString() : undefined,
        endedAt: formData.endedAt ? new Date(formData.endedAt).toISOString() : undefined,
      };

      if (editingProject) {
        await apiClient.request(`/projects/${editingProject.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient.post('/projects', payload);
      }

      setRefreshKey((k) => k + 1);
      closeModal();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while saving the project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (proj: Project, newStatus: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED') => {
    const statusLabels: Record<string, string> = {
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      ARCHIVED: 'Archived',
    };

    if (
      !window.confirm(
        `Are you sure you want to mark project "${proj.name}" as ${statusLabels[newStatus]}?`
      )
    ) {
      return;
    }

    try {
      await apiClient.request(`/projects/${proj.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (viewingProject && viewingProject.id === proj.id) {
        setViewingProject({ ...viewingProject, status: newStatus });
      }
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update project status');
    }
  };

    const renderStatusBadge = (status: string) => {
    return <StatusBadge status={status} />;
  };

  const listColumns: Column<Project>[] = [
    { header: 'Project Name', key: 'name' },
    {
      header: 'Customer',
      key: 'customer',
      render: (item) => item.customer?.name || '-',
    },
    { header: 'Job No.', key: 'jobNo', render: (item) => item.jobNo || '-' },
    { header: 'Location', key: 'location' },
    {
      header: 'Status',
      key: 'status',
      render: (item) => renderStatusBadge(item.status),
    },
    {
      header: 'Start Date',
      key: 'startedAt',
      render: (item) => (item.startedAt ? new Date(item.startedAt).toLocaleDateString() : '-'),
    },
    {
      header: 'End Date',
      key: 'endedAt',
      render: (item) => (item.endedAt ? new Date(item.endedAt).toLocaleDateString() : '-'),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Button variant="icon" onClick={() => handleViewProject(item.id)} title="View Details" style={{ color: "#2250A1" }}><Eye size={16} /></Button>
          <Button variant="icon" onClick={() => openModal(item)} title="Edit Project"><Edit2 size={16} /></Button>
          {item.status === 'ACTIVE' && (
            <>
              <Button variant="icon" onClick={() => handleStatusChange(item, "COMPLETED")} title="Mark Completed" style={{ color: "#10B981" }}><CheckCircle2 size={16} /></Button>
              <Button variant="icon" onClick={() => handleStatusChange(item, "ARCHIVED")} title="Archive Project" style={{ color: "#6B7280" }}><Archive size={16} /></Button>
            </>
          )}
          {(item.status === 'COMPLETED' || item.status === 'ARCHIVED') && (
            <Button variant="icon" onClick={() => handleStatusChange(item, "ACTIVE")} title="Reactivate Project" style={{ color: "#2250A1" }}><RotateCcw size={16} /></Button>
          )}
        </div>
      ),
    },
  ];

  if (viewingProject || isLoadingDetail) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        {/* Detail Header */}
        <PageHeader
          title={viewingProject?.name || 'Loading project...'}
          description="Project specifications, location, inventory, and delivery tracking."
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft size={16} /> Back
              </Button>
              {viewingProject && (
                <>
                  <Button variant="secondary" onClick={() => openModal(viewingProject)}>
                    <Edit2 size={14} /> Edit
                  </Button>
                  {viewingProject.status === 'ACTIVE' && (
                    <>
                      <Button variant="secondary" onClick={() => handleStatusChange(viewingProject, 'COMPLETED')} style={{ color: '#10B981', borderColor: '#10B981' }}>
                        <CheckCircle2 size={14} /> Mark Completed
                      </Button>
                      <Button variant="secondary" onClick={() => handleStatusChange(viewingProject, 'ARCHIVED')} style={{ color: '#6B7280', borderColor: '#6B7280' }}>
                        <Archive size={14} /> Archive
                      </Button>
                    </>
                  )}
                  {(viewingProject.status === 'COMPLETED' || viewingProject.status === 'ARCHIVED') && (
                    <Button variant="secondary" onClick={() => handleStatusChange(viewingProject, 'ACTIVE')} style={{ color: '#2250A1', borderColor: '#2250A1' }}>
                      <RotateCcw size={14} /> Reactivate
                    </Button>
                  )}
                </>
              )}
            </div>
          }
        />

        {isLoadingDetail ? (
          <Card style={{ padding: "32px", textAlign: "center", color: "#6B7280" }}>
            Loading project details...
          </Card>
        ) : viewingProject ? (
          <>
            {/* Project Overview Card */}
            <Card style={{ marginBottom: "24px" }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1F2839' }}>
                Project Overview
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                }}
              >
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Customer / Mitra
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.customer ? `${viewingProject.customer.name} ${viewingProject.customer.code ? `(${viewingProject.customer.code})` : ''}` : 'Internal Project'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Job Number
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.jobNo || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Location Address
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.location}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Attn / PIC
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.attnName || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Project Leader
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.leaderName || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Activity
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.activity || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    Start Date
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.startedAt ? new Date(viewingProject.startedAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#B5B8BF', textTransform: 'uppercase' }}>
                    End Date
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2839' }}>
                    {viewingProject.endedAt ? new Date(viewingProject.endedAt).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Inventory at Project Section */}
            <Card style={{ marginBottom: "24px" }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Boxes size={18} color="#2250A1" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2839' }}>
                  Inventory at Project
                </h3>
              </div>

              {viewingProject.projectStocks && viewingProject.projectStocks.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E5E7EB', textAlign: 'left', color: '#4B5563' }}>
                        <th style={{ padding: '8px 12px' }}>Brand</th>
                        <th style={{ padding: '8px 12px' }}>Item Name</th>
                        <th style={{ padding: '8px 12px' }}>Tracking Type</th>
                        <th style={{ padding: '8px 12px' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProject.projectStocks.map((stock) => (
                        <tr key={stock.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{stock.item.brand}</td>
                          <td style={{ padding: '8px 12px' }}>{stock.item.name}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: stock.item.trackingType === 'SERIALIZED' ? '#8B5CF6' : '#10B981',
                              }}
                            >
                              {stock.item.trackingType}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                            {stock.quantity} {stock.item.unit?.symbol || stock.item.unit?.name || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    border: '1px dashed #E5E7EB',
                    color: '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  No inventory items currently assigned to this project.
                </div>
              )}
            </Card>

            {/* Delivery Orders Section */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Truck size={18} color="#2250A1" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2839' }}>
                  Delivery Orders
                </h3>
              </div>

              {viewingProject.deliveryOrders && viewingProject.deliveryOrders.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E5E7EB', textAlign: 'left', color: '#4B5563' }}>
                        <th style={{ padding: '8px 12px' }}>DO Number</th>
                        <th style={{ padding: '8px 12px' }}>Date</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProject.deliveryOrders.map((dOrder) => (
                        <tr key={dOrder.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{dOrder.doNumber}</td>
                          <td style={{ padding: '8px 12px' }}>{new Date(dOrder.date).toLocaleDateString()}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge-status ${dOrder.status.toLowerCase()}`}>
                              {dOrder.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    border: '1px dashed #E5E7EB',
                    color: '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  No delivery orders linked to this project.
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <PageHeader
        title="Projects"
        description="Manage client and internal project assignments, locations, and inventory."
        actions={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#1F2839',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>
            <Button variant="primary" onClick={() => openModal()}>
              Add Project
            </Button>
          </>
        }
      />

      <Card style={{ padding: 0 }}>
        <PaginatedTable<Project>
          columns={listColumns}
          fetchUrl="/projects"
          searchPlaceholder="Search projects by name, job no, location, or customer..."
          extraParams={{
            refreshKey,
            status: statusFilter === 'all' ? undefined : statusFilter,
          }}
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProject ? 'Edit Project' : 'Add Project'} width="600px">
        {errorMsg && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Project Name" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>
            
            <FormField label="Job Number">
              <Input
                value={formData.jobNo}
                onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
              />
            </FormField>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Customer / Mitra">
              <Select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              >
                <option value="">Internal Project (No Customer)</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Activity">
              <Input
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
              />
            </FormField>
          </div>
          
          <FormField label="Location Address" required>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Attn / PIC">
              <Input
                value={formData.attnName}
                onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
              />
            </FormField>
            
            <FormField label="Project Leader">
              <Input
                value={formData.leaderName}
                onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
              />
            </FormField>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Projects;

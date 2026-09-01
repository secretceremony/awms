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
    if (status === 'ACTIVE') {
      return <span className="badge-status active">Active</span>;
    }
    if (status === 'COMPLETED') {
      return (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            backgroundColor: 'rgba(34, 80, 161, 0.1)',
            color: '#2250A1',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(34, 80, 161, 0.2)',
          }}
        >
          Completed
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          color: '#6B7280',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(107, 114, 128, 0.2)',
        }}
      >
        Archived
      </span>
    );
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
          <button
            onClick={() => handleViewProject(item.id)}
            title="View Details"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#2250A1',
            }}
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openModal(item)}
            title="Edit Project"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#4B5563',
            }}
          >
            <Edit2 size={16} />
          </button>
          {item.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => handleStatusChange(item, 'COMPLETED')}
                title="Mark Completed"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#10B981',
                }}
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                onClick={() => handleStatusChange(item, 'ARCHIVED')}
                title="Archive Project"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6B7280',
                }}
              >
                <Archive size={16} />
              </button>
            </>
          )}
          {(item.status === 'COMPLETED' || item.status === 'ARCHIVED') && (
            <button
              onClick={() => handleStatusChange(item, 'ACTIVE')}
              title="Reactivate Project"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#2250A1',
              }}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (viewingProject || isLoadingDetail) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        {/* Detail Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleBackToList}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1F2839' }}>
                  {viewingProject?.name || 'Loading project...'}
                </h2>
                {viewingProject && renderStatusBadge(viewingProject.status)}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B5B8BF' }}>
                Project specifications, location, inventory, and delivery tracking.
              </p>
            </div>
          </div>

          {viewingProject && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => openModal(viewingProject)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Edit2 size={14} />
                Edit
              </button>
              {viewingProject.status === 'ACTIVE' && (
                <>
                  <button
                    onClick={() => handleStatusChange(viewingProject, 'COMPLETED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Mark Completed
                  </button>
                  <button
                    onClick={() => handleStatusChange(viewingProject, 'ARCHIVED')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Archive size={14} />
                    Archive
                  </button>
                </>
              )}
              {(viewingProject.status === 'COMPLETED' || viewingProject.status === 'ARCHIVED') && (
                <button
                  onClick={() => handleStatusChange(viewingProject, 'ACTIVE')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#2250A1',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  Reactivate
                </button>
              )}
            </div>
          )}
        </div>

        {isLoadingDetail ? (
          <div className="content-card" style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>
            Loading project details...
          </div>
        ) : viewingProject ? (
          <>
            {/* Project Overview Card */}
            <div className="content-card" style={{ padding: '24px', marginBottom: '24px' }}>
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
            </div>

            {/* Inventory at Project Section */}
            <div className="content-card" style={{ padding: '24px', marginBottom: '24px' }}>
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
            </div>

            {/* Delivery Orders Section */}
            <div className="content-card" style={{ padding: '24px' }}>
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
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1F2839' }}>Projects</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B5B8BF' }}>
            Manage client and internal project assignments, locations, and inventory.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button
            onClick={() => openModal()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2250A1',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Add Project
          </button>
        </div>
      </div>

      <div className="content-card" style={{ padding: 0 }}>
        <PaginatedTable<Project>
          columns={listColumns}
          fetchUrl="/projects"
          searchPlaceholder="Search projects by name, job no, location, or customer..."
          extraParams={{
            refreshKey,
            status: statusFilter === 'all' ? undefined : statusFilter,
          }}
        />
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#1F2839' }}>
              {editingProject ? 'Edit Project' : 'Add Project'}
            </h3>
            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '4px',
                  }}
                >
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project BTS Fiber Phase 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '4px',
                  }}
                >
                  Customer / Mitra
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">No Customer (Internal Project)</option>
                  {customerOptions.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.code ? `(${cust.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '4px',
                    }}
                  >
                    Job No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JOB-2026-001"
                    value={formData.jobNo}
                    onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '4px',
                    }}
                  >
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cikarang Site B"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '4px',
                    }}
                  >
                    Attn / PIC
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Budi Santoso"
                    value={formData.attnName}
                    onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '4px',
                    }}
                  >
                    Project Leader
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Andi Wijaya"
                    value={formData.leaderName}
                    onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4B5563',
                    marginBottom: '4px',
                  }}
                >
                  Activity
                </label>
                <input
                  type="text"
                  placeholder="e.g. Installation & Testing"
                  value={formData.activity}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '4px',
                    }}
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startedAt}
                    onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#4B5563',
                      marginBottom: '4px',
                    }}
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endedAt}
                    onChange={(e) => setFormData({ ...formData, endedAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2250A1',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Projects;

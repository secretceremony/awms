import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Select,
  Input,
  StatusBadge,
  ConfirmModal,
} from '../../components/ui/index.js';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { DeliveryOrderFormModal } from '../../components/delivery/DeliveryOrderFormModal.js';
import { DeliveryOrderDetailModal } from '../../components/delivery/DeliveryOrderDetailModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';
import { apiClient } from '../../api/client.js';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Warehouse,
  Building,
} from 'lucide-react';

export interface DeliveryOrderListItem {
  id: number;
  doNumber: string | null;
  date: string;
  activity: string;
  status: 'DRAFT' | 'ISSUED' | 'APPROVED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  clientCompanyName?: string | null;
  clientType?: string | null;
  projectName?: string | null;
  siteCode?: string | null;
  referenceNumber?: string | null;
  warehouseName?: string | null;
  warehouseCityCode?: string | null;
  client?: {
    id: number;
    name: string;
    clientType: string;
  };
  project?: {
    id: number;
    name: string;
    siteCode: string | null;
    referenceNumber: string | null;
  };
  sourceWarehouse?: {
    id: number;
    name: string;
    cityCode: string;
  };
  items?: any[];
}

export const Orders: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const projectId = searchParams.get('projectId') || '';
  const clientId = searchParams.get('clientId') || '';
  const warehouseId = searchParams.get('warehouseId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedFormDoId, setSelectedFormDoId] = useState<number | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailDoId, setSelectedDetailDoId] = useState<number | null>(null);

  // Confirm cancel draft state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'primary';
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

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [projRes, clientRes, whRes]: [any, any, any] = await Promise.all([
          apiClient.get('/projects', { params: { limit: 100 } }),
          apiClient.get('/clients', { params: { limit: 100 } }),
          apiClient.get('/warehouses', { params: { limit: 100 } }),
        ]);
        setProjects(Array.isArray(projRes) ? projRes : projRes?.data || []);
        setClients(Array.isArray(clientRes) ? clientRes : clientRes?.data || []);
        setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
      }
    };
    fetchDropdowns();
  }, []);

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
  if (projectId) {
    const matchedP = projects.find((p) => String(p.id) === projectId);
    activeFilters.push({
      key: 'projectId',
      label: 'Project',
      valueDisplay: matchedP ? matchedP.name : `Proj #${projectId}`,
      onClear: () => updateFilters({ projectId: null }),
    });
  }
  if (clientId) {
    const matchedC = clients.find((c) => String(c.id) === clientId);
    activeFilters.push({
      key: 'clientId',
      label: 'Client',
      valueDisplay: matchedC ? matchedC.name : `Client #${clientId}`,
      onClear: () => updateFilters({ clientId: null }),
    });
  }
  if (warehouseId) {
    const matchedWh = warehouses.find((w) => String(w.id) === warehouseId);
    activeFilters.push({
      key: 'warehouseId',
      label: 'Warehouse',
      valueDisplay: matchedWh ? (matchedWh.cityCode || matchedWh.name) : `WH #${warehouseId}`,
      onClear: () => updateFilters({ warehouseId: null }),
    });
  }
  if (dateFrom) {
    activeFilters.push({
      key: 'dateFrom',
      label: 'From',
      valueDisplay: dateFrom,
      onClear: () => updateFilters({ dateFrom: null }),
    });
  }
  if (dateTo) {
    activeFilters.push({
      key: 'dateTo',
      label: 'To',
      valueDisplay: dateTo,
      onClear: () => updateFilters({ dateTo: null }),
    });
  }

  const handleCreate = () => {
    setSelectedFormDoId(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedFormDoId(id);
    setIsFormModalOpen(true);
  };

  const handleView = (id: number) => {
    setSelectedDetailDoId(id);
    setIsDetailModalOpen(true);
  };

  const handleCancelDraft = (id: number) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel & Delete Draft',
      message: `Are you sure you want to cancel and delete Delivery Order Draft #${id}?`,
      confirmText: 'Delete Draft',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/delivery-orders/${id}/draft`);
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          setActionError(err.message || 'Failed to cancel draft');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const columns: Column<DeliveryOrderListItem>[] = [
    {
      key: 'doNumber',
      header: 'DO Number / Draft',
      render: (item: DeliveryOrderListItem) => {
        if (item.doNumber) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, color: '#2250A1', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {item.doNumber}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {item.activity}
              </span>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.75rem',
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                width: 'fit-content',
              }}
            >
              Draft #{item.id}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
              {item.activity}
            </span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: DeliveryOrderListItem) => (
        <span style={{ color: '#4B5563', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          {new Date(item.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'project',
      header: 'Project / Site',
      render: (item: DeliveryOrderListItem) => {
        const name = item.projectName || item.project?.name || '—';
        const site = item.siteCode || item.project?.siteCode;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1F2839' }}>
              <Building size={14} style={{ color: '#0891B2', flexShrink: 0 }} />
              <span>{name}</span>
            </div>
            {site && (
              <span style={{ fontSize: '0.75rem', color: '#0891B2', fontWeight: 700 }}>
                Site: {site}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'client',
      header: 'Client / Company',
      render: (item: DeliveryOrderListItem) => {
        const name = item.clientCompanyName || item.client?.name || '—';
        const type = item.clientType || item.client?.clientType || 'OTHER';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 600, color: '#1F2839' }}>{name}</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '1px 5px',
                borderRadius: '3px',
                fontWeight: 700,
                backgroundColor: type === 'PHM' ? 'rgba(34, 80, 161, 0.1)' : '#F3F4F6',
                color: type === 'PHM' ? '#2250A1' : '#4B5563',
              }}
            >
              {type}
            </span>
          </div>
        );
      },
    },
    {
      key: 'referenceNumber',
      header: 'Reference No.',
      render: (item: DeliveryOrderListItem) => {
        const ref = item.referenceNumber || item.project?.referenceNumber;
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              backgroundColor: ref ? 'rgba(34, 80, 161, 0.08)' : 'transparent',
              color: ref ? '#2250A1' : '#9CA3AF',
              border: ref ? '1px solid rgba(34, 80, 161, 0.2)' : 'none',
            }}
          >
            {ref || '—'}
          </span>
        );
      },
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (item: DeliveryOrderListItem) => {
        const whCity = item.warehouseCityCode || item.sourceWarehouse?.cityCode;
        const whName = item.warehouseName || item.sourceWarehouse?.name;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Warehouse size={14} style={{ color: '#2250A1' }} />
            <span style={{ fontWeight: 600, color: '#1F2839' }}>
              {whCity || whName || '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: DeliveryOrderListItem) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: DeliveryOrderListItem) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(item.id)}
            title="View Delivery Order Details"
          >
            <Eye size={15} />
          </Button>

          {item.status === 'DRAFT' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item.id)}
                title="Edit Draft"
              >
                <Edit2 size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelDraft(item.id)}
                title="Cancel & Delete Draft"
                style={{ color: '#EF4444' }}
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}

          {item.status === 'ISSUED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/delivery-orders/${item.id}/print`, '_blank')}
              title="Print Delivery Order"
              style={{ color: '#2250A1' }}
            >
              <Printer size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Delivery Orders"
        description="Official dispatch documentation, client project allocations, and verifiable item transfer manifests"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} /> Create Delivery Order
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
        searchPlaceholder="Search DO number, project, site, client, item, or serial..."
        primaryFilter={
          <div style={{ width: '160px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft Only</option>
              <option value="ISSUED">Issued Only</option>
            </Select>
          </div>
        }
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
        <div style={{ width: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Destination Project
          </label>
          <Select
            value={projectId}
            onChange={(e) => updateFilters({ projectId: e.target.value })}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.siteCode ? `[${p.siteCode}]` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ width: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Client / Company
          </label>
          <Select
            value={clientId}
            onChange={(e) => updateFilters({ clientId: e.target.value })}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ width: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Source Warehouse
          </label>
          <Select
            value={warehouseId}
            onChange={(e) => updateFilters({ warehouseId: e.target.value })}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.cityCode || w.name} ({w.name})
              </option>
            ))}
          </Select>
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            From Date
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
          />
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            To Date
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
          />
        </div>
      </FilterPanel>

      <PaginatedTable<DeliveryOrderListItem>
        fetchUrl="/delivery-orders"
        searchPlaceholder="Search delivery orders..."
        columns={columns}
        extraParams={{
          status: statusFilter !== 'all' ? statusFilter : undefined,
          projectId: projectId ? Number(projectId) : undefined,
          clientId: clientId ? Number(clientId) : undefined,
          warehouseId: warehouseId ? Number(warehouseId) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
          _refresh: refreshTrigger,
        }}
      />

      <DeliveryOrderFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        deliveryOrderId={selectedFormDoId}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <DeliveryOrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        deliveryOrderId={selectedDetailDoId}
        onEditDraft={(id) => {
          setSelectedFormDoId(id);
          setIsFormModalOpen(true);
        }}
        onDraftCancelled={() => setRefreshTrigger((prev) => prev + 1)}
        onIssuedSuccess={() => setRefreshTrigger((prev) => prev + 1)}
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

export default Orders;

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Select,
  Input,
} from '../../components/ui/index.js';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { AddOutgoingModal } from '../../components/outgoing/AddOutgoingModal.js';
import { OutgoingDetailModal } from '../../components/outgoing/OutgoingDetailModal.js';
import { DeliveryOrderFormModal } from '../../components/delivery/DeliveryOrderFormModal.js';
import { ExcelImportModal } from '../../components/common/ExcelImportModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';
import { apiClient } from '../../api/client.js';
import { Plus, Eye, Warehouse, Building, Upload } from 'lucide-react';

export interface OutgoingMovementItem {
  id: number;
  quantity: number;
  item: {
    id: number;
    name: string;
    brand: string | null;
    modelNumber: string | null;
    trackingType: 'BULK' | 'SERIALIZED';
    unit: {
      id: number;
      name: string;
      symbol: string;
    };
  };
  movementSerials: Array<{
    id: number;
    itemSerial: {
      id: number;
      serialNumber: string;
      state: string;
      conditionLabel: string | null;
    };
  }>;
}

export interface OutgoingMovement {
  id: number;
  movementNumber: string;
  movementType: string;
  movementDate: string;
  notes: string | null;
  referenceNumber: string | null;
  sourceWarehouse?: {
    id: number;
    name: string;
    cityCode: string;
    location: string;
  };
  project?: {
    id: number;
    name: string;
    siteCode: string | null;
    location: string;
    client?: {
      id: number;
      name: string;
    };
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
  items: OutgoingMovementItem[];
}

export const Outgoing: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const warehouseId = searchParams.get('warehouseId') || '';
  const projectId = searchParams.get('projectId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const dispatchSource = searchParams.get('dispatchSource') || 'all';

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateDoOpen, setIsCreateDoOpen] = useState(false);
  const [createDoMovementId, setCreateDoMovementId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [whRes, prRes]: [any, any] = await Promise.all([
          apiClient.get('/warehouses', { params: { limit: 100 } }),
          apiClient.get('/projects', { params: { limit: 100 } }),
        ]);
        setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
        setProjects(Array.isArray(prRes) ? prRes : prRes?.data || []);
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

  const handleOpenDetail = (movementId: number) => {
    setSelectedMovementId(movementId);
    setIsDetailModalOpen(true);
  };

  const activeFilters: ActiveFilter[] = [];
  if (projectId) {
    const matchedP = projects.find((p) => String(p.id) === projectId);
    activeFilters.push({
      key: 'projectId',
      label: 'Project',
      valueDisplay: matchedP ? `${matchedP.name} ${matchedP.siteCode ? `[${matchedP.siteCode}]` : ''}` : `Proj #${projectId}`,
      onClear: () => updateFilters({ projectId: null }),
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
  if (dispatchSource && dispatchSource !== 'all') {
    activeFilters.push({
      key: 'dispatchSource',
      label: 'Source',
      valueDisplay: dispatchSource.toUpperCase(),
      onClear: () => updateFilters({ dispatchSource: null }),
    });
  }

  const columns: Column<OutgoingMovement>[] = [
    {
      key: 'movementDate',
      header: 'Movement Date',
      render: (m: OutgoingMovement) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839', fontSize: '0.8rem' }}>
            {new Date(m.movementDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
          <span style={{ fontSize: '0.725rem', color: '#6B7280', fontFamily: 'monospace' }}>
            {m.movementNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'sourceWarehouse',
      header: 'Source Warehouse',
      render: (m: OutgoingMovement) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Warehouse size={14} style={{ color: '#2250A1', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: '#1F2839' }}>
            {m.sourceWarehouse?.cityCode || m.sourceWarehouse?.name || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Project / Site',
      render: (m: OutgoingMovement) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1F2839' }}>
            <Building size={14} style={{ color: '#0891B2', flexShrink: 0 }} />
            <span>{m.project?.name || '—'}</span>
          </div>
          {m.project?.siteCode && (
            <span style={{ fontSize: '0.75rem', color: '#0891B2', fontWeight: 700 }}>
              Site: {m.project.siteCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'deliveryOrder',
      header: 'Delivery Order',
      render: (m: OutgoingMovement & { deliveryOrder?: { id: number; doNumber: string; status: string } }) => {
        const doInfo = (m as any).deliveryOrder;
        if (doInfo && (doInfo.doNumber || doInfo.id)) {
          return (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: 'monospace',
                backgroundColor: 'rgba(34, 80, 161, 0.1)',
                color: '#2250A1',
                border: '1px solid rgba(34, 80, 161, 0.2)',
              }}
            >
              {doInfo.doNumber || `DO #${doInfo.id}`}
            </span>
          );
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #E5E7EB',
              }}
            >
              Not Created
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreateDoMovementId(m.id);
                setIsCreateDoOpen(true);
              }}
              style={{ padding: '2px 6px', fontSize: '0.7rem', color: '#2250A1', fontWeight: 600 }}
              title="Create Delivery Order from this Outgoing"
            >
              + Create DO
            </Button>
          </div>
        );
      },
    },
    {
      key: 'itemsSummary',
      header: 'Item',
      render: (m: OutgoingMovement) => {
        if (!m.items || m.items.length === 0) return <span>—</span>;
        const first = m.items[0];
        const remaining = m.items.length - 1;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: '#1F2839' }}>{first.item?.name}</span>
            {remaining > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#2250A1', fontWeight: 600 }}>
                +{remaining} more item{remaining > 1 ? 's' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (m: OutgoingMovement) => {
        const totalQty = m.items?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
        const unit = m.items?.[0]?.item?.unit?.symbol || m.items?.[0]?.item?.unit?.name || 'pcs';
        return (
          <span style={{ fontWeight: 700 }}>
            {totalQty} {unit}
          </span>
        );
      },
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (m: OutgoingMovement) => (
        <span style={{ color: '#4B5563', fontSize: '0.8rem' }}>
          {m.createdBy?.name || m.createdBy?.email || 'Admin'}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Purpose',
      render: (m: OutgoingMovement) => (
        <span
          style={{
            maxWidth: '140px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            color: m.notes ? '#374151' : '#9CA3AF',
            fontSize: '0.8rem',
          }}
          title={m.notes || ''}
        >
          {m.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (m: OutgoingMovement) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenDetail(m.id)}
          title="View Outgoing Details"
        >
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Outgoing Stock Movements"
        description="Dispatch items and serialized assets from warehouse inventory to active client projects"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={16} /> Import Excel
            </Button>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} /> Add Outgoing
            </Button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search item, brand, MN, SN, project, or purpose..."
        primaryFilter={
          <div style={{ width: '200px' }}>
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

        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Dispatch Source
          </label>
          <Select
            value={dispatchSource}
            onChange={(e) => updateFilters({ dispatchSource: e.target.value })}
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual Only</option>
            <option value="do">Delivery Order Only</option>
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

      <PaginatedTable<OutgoingMovement>
        fetchUrl="/stock-movements/outgoing"
        searchPlaceholder="Search outgoing movements..."
        columns={columns}
        extraParams={{
          warehouseId: warehouseId ? Number(warehouseId) : undefined,
          projectId: projectId ? Number(projectId) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
          _refresh: refreshTrigger,
        }}
      />

      <AddOutgoingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importType="OUTGOING"
        title="Import Outgoing Movements from Excel"
        templateType="outgoing"
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <OutgoingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        movementId={selectedMovementId}
        onCreateDo={(mId) => {
          setCreateDoMovementId(mId);
          setIsCreateDoOpen(true);
        }}
      />

      <DeliveryOrderFormModal
        isOpen={isCreateDoOpen}
        onClose={() => {
          setIsCreateDoOpen(false);
          setCreateDoMovementId(null);
        }}
        initialStockMovementId={createDoMovementId}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
};

export default Outgoing;

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, RotateCcw, PackageCheck } from 'lucide-react';
import { Button, PageHeader, Select, Input } from '../../components/ui/index.js';
import { AddIncomingModal } from '../../components/inventory/AddIncomingModal.js';
import { IncomingDetailModal } from '../../components/inventory/IncomingDetailModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';

interface StockMovement {
  id: number;
  movementNumber: string;
  movementType: 'INCOMING' | 'RETURN';
  movementDate: string;
  referenceNumber: string | null;
  notes: string | null;
  destinationWarehouse?: {
    id: number;
    name: string;
    cityCode?: string | null;
  };
  project?: {
    id: number;
    name: string;
    siteCode?: string | null;
    client?: { name: string };
  };
  deliveryOrder?: {
    id: number;
    doNumber: string | null;
  };
  createdBy?: {
    name: string;
  };
  items: Array<{
    id: number;
    quantity: number;
    item: {
      id: number;
      name: string;
      brand: string | null;
      modelNumber: string | null;
      trackingType: 'BULK' | 'SERIALIZED';
      unit?: { name: string; symbol: string | null };
    };
    movementSerials?: Array<{
      id: number;
      itemSerial: {
        id: number;
        serialNumber: string;
        state: string;
        conditionLabel: string | null;
        notes: string | null;
      };
    }>;
  }>;
}

export const Incoming: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State
  const search = searchParams.get('search') || '';
  const movementType = searchParams.get('type') || searchParams.get('movementType') || 'ALL';
  const warehouseId = searchParams.get('warehouseId') || '';
  const projectId = searchParams.get('projectId') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; cityCode?: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string; siteCode?: string | null }[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [whRes, projRes]: any = await Promise.all([
          apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } }),
          apiClient.get('/projects', { params: { limit: 100 } }),
        ]);
        setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
        setProjects(Array.isArray(projRes) ? projRes : projRes?.data || []);
      } catch (err) {
        console.error('Failed to load filter dependencies:', err);
      }
    };
    fetchDependencies();
  }, []);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL' || val === 'all') {
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

  // Active filter badges
  const activeFilters: ActiveFilter[] = [];
  if (movementType && movementType !== 'ALL') {
    activeFilters.push({
      key: 'type',
      label: 'Type',
      valueDisplay: movementType === 'INCOMING' ? 'Regular Incoming' : 'Project Return',
      onClear: () => updateFilters({ type: null, movementType: null }),
    });
  }
  if (warehouseId) {
    const matchedWh = warehouses.find((w) => String(w.id) === warehouseId);
    activeFilters.push({
      key: 'warehouseId',
      label: 'Warehouse',
      valueDisplay: matchedWh ? `${matchedWh.name} [${matchedWh.cityCode || ''}]` : warehouseId,
      onClear: () => updateFilters({ warehouseId: null }),
    });
  }
  if (projectId) {
    const matchedProj = projects.find((p) => String(p.id) === projectId);
    activeFilters.push({
      key: 'projectId',
      label: 'Project',
      valueDisplay: matchedProj ? matchedProj.name : projectId,
      onClear: () => updateFilters({ projectId: null }),
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

  const columns: Column<StockMovement>[] = [
    {
      header: 'Movement Date',
      key: 'movementDate',
      render: (m) => (
        <span style={{ fontSize: '13px', color: '#4B5563', whiteSpace: 'nowrap' }}>
          {new Date(m.movementDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Type',
      key: 'movementType',
      render: (m) => {
        const isReturn = m.movementType === 'RETURN';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isReturn ? '#F5F3FF' : '#EFF6FF',
              color: isReturn ? '#7C3AED' : '#2250A1',
              border: `1px solid ${isReturn ? '#DDD6FE' : '#BFDBFE'}`,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}
          >
            {isReturn ? <RotateCcw size={12} /> : <PackageCheck size={12} />}
            {isReturn ? 'Return' : 'Incoming'}
          </span>
        );
      },
    },
    {
      header: 'Warehouse',
      key: 'destinationWarehouse',
      render: (m) => (
        <span style={{ fontWeight: 600, color: '#1F2839' }}>
          {m.destinationWarehouse?.cityCode || m.destinationWarehouse?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Project / Source',
      key: 'project',
      render: (m) => {
        if (m.movementType === 'RETURN' && m.project) {
          return (
            <div>
              <div style={{ fontWeight: 600, color: '#1F2839', fontSize: '13px' }}>
                {m.project.siteCode ? `[${m.project.siteCode}] ` : ''}
                {m.project.name}
              </div>
              {m.project.client?.name && (
                <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.project.client.name}</div>
              )}
            </div>
          );
        }
        return <span style={{ color: '#9CA3AF', fontSize: '12px' }}>External</span>;
      },
    },
    {
      header: 'Item',
      key: 'items',
      render: (m) => {
        const firstItem = m.items[0]?.item;
        if (!firstItem) return '-';
        return (
          <div>
            <span style={{ fontWeight: 600, color: '#1F2839' }}>{firstItem.name}</span>
            {m.items.length > 1 && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                +{m.items.length - 1} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'SN',
      key: 'serialNumber',
      render: (m) => {
        const firstItem = m.items[0];
        if (!firstItem || firstItem.item.trackingType !== 'SERIALIZED') return '-';
        const serials = firstItem.movementSerials || [];
        if (serials.length === 0) return '-';
        if (serials.length === 1) {
          return (
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
              {serials[0].itemSerial.serialNumber}
            </span>
          );
        }
        return (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
            {serials[0].itemSerial.serialNumber} (+{serials.length - 1})
          </span>
        );
      },
    },
    {
      header: 'Qty',
      key: 'quantity',
      render: (m) => {
        const totalQty = m.items.reduce((acc, curr) => acc + curr.quantity, 0);
        return <span style={{ fontWeight: 600 }}>{totalQty}</span>;
      },
    },
    {
      header: 'Unit',
      key: 'unit',
      render: (m) => {
        const firstItem = m.items[0]?.item;
        return firstItem?.unit?.symbol || firstItem?.unit?.name || 'pcs';
      },
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (m) => {
        const firstItem = m.items[0];
        if (!firstItem || firstItem.item.trackingType !== 'SERIALIZED') return '-';
        const serials = firstItem.movementSerials || [];
        if (serials.length === 0) return '-';
        const cond = serials[0].itemSerial.conditionLabel || serials[0].itemSerial.state;
        return (
          <span style={{ fontSize: '12px', color: '#4B5563' }}>
            {cond || 'Standby Good'}
          </span>
        );
      },
    },
    {
      header: 'Reference',
      key: 'referenceNumber',
      render: (m) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4B5563' }}>
          {m.referenceNumber || '-'}
        </span>
      ),
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (m) => (
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {m.createdBy?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (m) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMovementId(m.id)}
            title="View Details"
          >
            <Eye size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Incoming Stock & Returns"
        description="Manage goods receipts from external suppliers and returns from projects into warehouses."
        actions={
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Add Incoming / Return
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search movement #, reference, item, SN, project, warehouse..."
        primaryFilter={
          <div style={{ width: '180px' }}>
            <Select
              value={movementType}
              onChange={(e) => updateFilters({ type: e.target.value, movementType: e.target.value })}
            >
              <option value="ALL">All Sources</option>
              <option value="INCOMING">Regular Incoming</option>
              <option value="RETURN">Project Returns</option>
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
            Destination Warehouse
          </label>
          <Select
            value={warehouseId}
            onChange={(e) => updateFilters({ warehouseId: e.target.value })}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.cityCode ? `[${w.cityCode}]` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Source Project
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

      <PaginatedTable<StockMovement>
        fetchUrl="/stock-movements/incoming"
        searchPlaceholder="Search movement #, reference, item, SN, project, warehouse..."
        columns={columns}
        extraParams={{
          search: search || undefined,
          movementType: movementType !== 'ALL' ? movementType : undefined,
          type: movementType !== 'ALL' ? movementType : undefined,
          warehouseId: warehouseId ? Number(warehouseId) : undefined,
          projectId: projectId ? Number(projectId) : undefined,
          startDate: dateFrom || undefined,
          endDate: dateTo || undefined,
          _refresh: refreshTrigger,
        }}
      />

      {/* Add Incoming / Return Modal */}
      <AddIncomingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Movement Details Modal */}
      <IncomingDetailModal
        isOpen={selectedMovementId !== null}
        movementId={selectedMovementId}
        onClose={() => setSelectedMovementId(null)}
      />
    </div>
  );
};

export default Incoming;

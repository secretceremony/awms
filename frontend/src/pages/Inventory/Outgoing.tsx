import React, { useState, useEffect } from 'react';
import {
  PageHeader,
  Button,
  Select,
  Input,
} from '../../components/ui/index.js';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { AddOutgoingModal } from '../../components/outgoing/AddOutgoingModal.js';
import { OutgoingDetailModal } from '../../components/outgoing/OutgoingDetailModal.js';
import { apiClient } from '../../api/client.js';
import { Plus, Eye, Warehouse, Building } from 'lucide-react';

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
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Filter states
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  const handleOpenDetail = (movementId: number) => {
    setSelectedMovementId(movementId);
    setIsDetailModalOpen(true);
  };

  const columns: Column<OutgoingMovement>[] = [
    {
      key: 'movementDate',
      header: 'Movement Date',
      render: (m: OutgoingMovement) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>
            {new Date(m.movementDate).toLocaleDateString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
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
      key: 'brand',
      header: 'Brand',
      render: (m: OutgoingMovement) => {
        const brand = m.items?.[0]?.item?.brand;
        return <span>{brand || '—'}</span>;
      },
    },
    {
      key: 'modelNumber',
      header: 'MN',
      render: (m: OutgoingMovement) => {
        const mn = m.items?.[0]?.item?.modelNumber;
        return <span>{mn || '—'}</span>;
      },
    },
    {
      key: 'serialNumber',
      header: 'SN',
      render: (m: OutgoingMovement) => {
        const first = m.items?.[0];
        if (!first || first.item?.trackingType !== 'SERIALIZED') return <span>—</span>;
        const serials = first.movementSerials || [];
        if (serials.length === 0) return <span>—</span>;
        if (serials.length === 1) {
          return (
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
              {serials[0].itemSerial?.serialNumber}
            </span>
          );
        }
        return (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
            {serials[0].itemSerial?.serialNumber} (+{serials.length - 1})
          </span>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (m: OutgoingMovement) => {
        const totalQty = m.items?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
        return <span style={{ fontWeight: 700 }}>{totalQty}</span>;
      },
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (m: OutgoingMovement) => {
        const unit = m.items?.[0]?.item?.unit;
        return <span>{unit?.symbol || unit?.name || 'pcs'}</span>;
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
      header: 'Notes',
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
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} /> Add Outgoing
          </Button>
        }
      />

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div style={{ width: '180px' }}>
          <Select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.cityCode || w.name} ({w.name})
              </option>
            ))}
          </Select>
        </div>

        <div style={{ width: '200px' }}>
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.siteCode ? `[${p.siteCode}]` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>From:</span>
          <div style={{ width: '140px' }}>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>To:</span>
          <div style={{ width: '140px' }}>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {(warehouseFilter || projectFilter || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setWarehouseFilter('');
              setProjectFilter('');
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <PaginatedTable<OutgoingMovement>
        fetchUrl="/stock-movements/outgoing"
        searchPlaceholder="Search item, brand, MN, SN, project, site code, or notes..."
        columns={columns}
        extraParams={{
          warehouseId: warehouseFilter ? Number(warehouseFilter) : undefined,
          projectId: projectFilter ? Number(projectFilter) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          _refresh: refreshTrigger,
        }}
      />

      <AddOutgoingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      <OutgoingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        movementId={selectedMovementId}
      />
    </div>
  );
};

export default Outgoing;

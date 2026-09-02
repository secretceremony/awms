import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageHeader, Select, Input, Button } from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../components/filters/index.js';
import {
  AuditLogDetailModal,
  formatActionLabel,
  getEntityRoute,
  type AuditLogItem,
} from '../components/audit/AuditLogDetailModal.js';
import { Eye, ExternalLink } from 'lucide-react';

export const Logs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state sync
  const search = searchParams.get('search') || '';
  const actionFilter = searchParams.get('action') || 'all';
  const entityFilter = searchParams.get('entity') || 'all';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });

    // Reset page to 1 when changing filters other than page itself
    if (!('page' in updates)) {
      nextParams.delete('page');
    }

    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
  };

  // Build active filter chips
  const activeFilters: ActiveFilter[] = [];
  if (actionFilter && actionFilter !== 'all') {
    activeFilters.push({
      key: 'action',
      label: 'Action',
      valueDisplay: formatActionLabel(actionFilter).text,
      onClear: () => updateFilters({ action: null }),
    });
  }
  if (entityFilter && entityFilter !== 'all') {
    activeFilters.push({
      key: 'entity',
      label: 'Module',
      valueDisplay: entityFilter,
      onClear: () => updateFilters({ entity: null }),
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

  const columns: Column<AuditLogItem>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (log: AuditLogItem) => {
        const info = formatActionLabel(log.action);
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: `${info.color}15`,
              color: info.color,
              border: `1px solid ${info.color}30`,
            }}
          >
            {info.text}
          </span>
        );
      },
    },
    {
      key: 'entityName',
      header: 'Module / Entity',
      render: (log: AuditLogItem) => (
        <span style={{ fontWeight: 600, color: '#374151' }}>
          {log.entityName || 'System'}
        </span>
      ),
    },
    {
      key: 'entityId',
      header: 'Reference ID',
      render: (log: AuditLogItem) => {
        if (!log.entityId) return <span style={{ color: '#9CA3AF' }}>—</span>;
        const route = getEntityRoute(log.entityName, log.entityId);
        if (route) {
          return (
            <Link
              to={route}
              style={{
                color: '#2250A1',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              #{log.entityId} <ExternalLink size={11} />
            </Link>
          );
        }
        return <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>#{log.entityId}</span>;
      },
    },
    {
      key: 'user',
      header: 'User',
      render: (log: AuditLogItem) => (
        <span style={{ color: '#1F2839', fontWeight: 500 }}>
          {log.user?.name || 'System / Guest'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log: AuditLogItem) => (
        <span style={{ color: '#4B5563', fontSize: '0.8rem' }}>
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (log: AuditLogItem) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedLogId(log.id);
            setIsDetailModalOpen(true);
          }}
          title="View Audit Details"
        >
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Activity & Audit Logs"
        description="Immutable chronological record of system operations, user logins, master data modifications, and stock ledger events"
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search action, entity, user name or email..."
        primaryFilter={
          <div style={{ width: '180px' }}>
            <Select
              value={actionFilter}
              onChange={(e) => updateFilters({ action: e.target.value })}
            >
              <option value="all">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DEACTIVATE">Deactivated</option>
              <option value="REACTIVATE">Reactivated</option>
              <option value="DELETE">Deleted</option>
              <option value="OUTGOING">Outgoing</option>
              <option value="INCOMING">Incoming</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="LOGIN">Logged In</option>
              <option value="LOGOUT">Logged Out</option>
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
            Module / Entity
          </label>
          <Select
            value={entityFilter}
            onChange={(e) => updateFilters({ entity: e.target.value })}
          >
            <option value="all">All Modules</option>
            <option value="warehouses">Warehouses</option>
            <option value="projects">Projects</option>
            <option value="clients">Clients</option>
            <option value="client_contacts">Client Contacts</option>
            <option value="units">Units</option>
            <option value="cities">Cities</option>
            <option value="items">Items</option>
            <option value="stock_movements">Stock Movements</option>
            <option value="system_settings">Settings</option>
            <option value="users">Users</option>
          </Select>
        </div>

        <div style={{ width: '150px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            From Date
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
          />
        </div>

        <div style={{ width: '150px' }}>
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

      <PaginatedTable<AuditLogItem>
        fetchUrl="/audit-logs"
        searchPlaceholder="Search audit logs..."
        columns={columns}
        extraParams={{
          action: actionFilter !== 'all' ? actionFilter : undefined,
          entityName: entityFilter !== 'all' ? entityFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
        }}
      />

      <AuditLogDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        logId={selectedLogId}
      />
    </div>
  );
};

export default Logs;

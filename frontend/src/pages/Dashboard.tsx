import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  Briefcase,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  PackageCheck,
  Plus,
  ArrowRight,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { Button, PageHeader, LoadingState, ErrorState } from '../components/ui/index.js';
import { apiClient } from '../api/client.js';

interface DashboardData {
  summary: {
    totalItems: number;
    totalBulkStock: number;
    totalSerialized: number;
    deployedSerialized: number;
    underRepairSerialized: number;
    activeProjects: number;
    draftDeliveryOrders: number;
    issuedDeliveryOrders: number;
    lowStockThreshold: number;
  };
  stockHealth: {
    normal: number;
    lowStock: number;
    outOfStock: number;
    underRepair: number;
    deployed: number;
  };
  recentMovements: Array<{
    id: number;
    movementNumber: string;
    movementType: 'INITIAL' | 'INCOMING' | 'OUTGOING' | 'RETURN' | 'ADJUSTMENT';
    movementDate: string;
    fromLocation: string;
    toLocation: string;
    itemCount: number;
    firstItemName: string;
    serialNumber: string | null;
    createdBy: string;
    notes: string | null;
  }>;
  recentDeliveryOrders: Array<{
    id: number;
    doNumber: string | null;
    projectName: string;
    siteCode: string | null;
    clientName: string;
    date: string;
    status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
    itemCount: number;
  }>;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res: any = await apiClient.get('/dashboard/summary');
      setData(res?.data || res);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setErrorMsg(err.message || 'Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingState text="Loading logistics dashboard analytics..." />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="page-container">
        <ErrorState
          message={errorMsg || 'Unable to connect to warehouse data server'}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  const { summary, stockHealth, recentMovements, recentDeliveryOrders } = data;

  const statCards = [
    {
      label: 'Total Catalog Items',
      value: summary.totalItems,
      unit: 'masters',
      icon: Boxes,
      color: '#2250A1',
      bg: '#EFF6FF',
      onClick: () => navigate('/inventory/stock'),
    },
    {
      label: 'Bulk Warehouse Stock',
      value: summary.totalBulkStock,
      unit: 'units',
      icon: Layers,
      color: '#0891B2',
      bg: '#ECFEFF',
      onClick: () => navigate('/inventory/stock?trackingType=bulk'),
    },
    {
      label: 'Serialized Assets',
      value: summary.totalSerialized,
      unit: 'devices',
      icon: PackageCheck,
      color: '#7C3AED',
      bg: '#F5F3FF',
      onClick: () => navigate('/inventory/stock?trackingType=serialized'),
    },
    {
      label: 'Deployed at Sites',
      value: summary.deployedSerialized,
      unit: 'in field',
      icon: ArrowUpRight,
      color: '#D97706',
      bg: '#FFFBEB',
      onClick: () => navigate('/inventory/stock?trackingType=serialized'),
    },
    {
      label: 'Under Repair',
      value: summary.underRepairSerialized,
      unit: 'faulty',
      icon: Wrench,
      color: '#DC2626',
      bg: '#FEF2F2',
      onClick: () => navigate('/inventory/stock?trackingType=serialized'),
    },
    {
      label: 'Low Stock (< threshold)',
      value: stockHealth.lowStock,
      unit: 'items',
      icon: AlertTriangle,
      color: '#EA580C',
      bg: '#FFF7ED',
      onClick: () => navigate('/inventory/stock?trackingType=bulk'),
    },
    {
      label: 'Active Projects',
      value: summary.activeProjects,
      unit: 'active',
      icon: Briefcase,
      color: '#059669',
      bg: '#ECFDF5',
      onClick: () => navigate('/projects'),
    },
    {
      label: 'Draft Delivery Orders',
      value: summary.draftDeliveryOrders,
      unit: 'pending',
      icon: Truck,
      color: '#4F46E5',
      bg: '#EEF2FF',
      onClick: () => navigate('/delivery/orders?status=DRAFT'),
    },
  ];

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'INCOMING':
        return { label: 'Incoming', bg: '#EFF6FF', color: '#2250A1', icon: ArrowDownLeft };
      case 'OUTGOING':
        return { label: 'Outgoing', bg: '#FFFBEB', color: '#D97706', icon: ArrowUpRight };
      case 'RETURN':
        return { label: 'Return', bg: '#F5F3FF', color: '#7C3AED', icon: RotateCcw };
      case 'ADJUSTMENT':
        return { label: 'Adjust', bg: '#FEF2F2', color: '#DC2626', icon: SlidersHorizontal };
      default:
        return { label: 'Initial', bg: '#F3F4F6', color: '#4B5563', icon: Boxes };
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Logistics Operations Dashboard"
        description="Real-time inventory levels, warehouse health, and dispatch movements."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/delivery/labels')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Truck size={15} /> Shipping Labels
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/delivery/orders')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> Delivery Orders
            </Button>
          </div>
        }
      />

      {/* 1. Real Statistics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '1.5rem',
        }}
      >
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: card.bg,
                  color: card.color,
                  flexShrink: 0,
                }}
              >
                <Icon size={22} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', lineHeight: '1.2', marginTop: '2px' }}>
                  {card.value}{' '}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8' }}>
                    {card.unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Stock Health & Quick Actions Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '1.5rem',
        }}
      >
        {/* Stock Health */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
              Inventory Health Status
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Threshold: &le; {summary.lowStockThreshold} units
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
                <CheckCircle2 size={14} /> Normal Stock
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>
                {stockHealth.normal}
              </div>
            </div>

            <div style={{ border: '1px solid #FED7AA', borderRadius: '6px', padding: '10px', backgroundColor: '#FFF7ED' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#EA580C' }}>
                <AlertTriangle size={14} /> Low Stock
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EA580C', marginTop: '4px' }}>
                {stockHealth.lowStock}
              </div>
            </div>

            <div style={{ border: '1px solid #FECACA', borderRadius: '6px', padding: '10px', backgroundColor: '#FEF2F2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#DC2626' }}>
                <ShieldAlert size={14} /> Out of Stock
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                {stockHealth.outOfStock}
              </div>
            </div>

            <div style={{ border: '1px solid #DDD6FE', borderRadius: '6px', padding: '10px', backgroundColor: '#F5F3FF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#7C3AED' }}>
                <Wrench size={14} /> Under Repair
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7C3AED', marginTop: '4px' }}>
                {stockHealth.underRepair}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Operational Shortcuts */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
            Quick Warehouse Operations
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => navigate('/inventory/incoming')}
              style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <ArrowDownLeft size={16} color="#2250A1" /> Record Incoming
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/inventory/outgoing')}
              style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <ArrowUpRight size={16} color="#D97706" /> Dispatch Outgoing
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/delivery/orders')}
              style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <Send size={16} color="#4F46E5" /> Issue Delivery Order
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/delivery/labels')}
              style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <Truck size={16} color="#059669" /> Print Shipping Label
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Recent Activity Section: Movements & DOs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Recent Movements */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
              Recent Inventory Movements
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory/movements')}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              View Ledger <ArrowRight size={13} />
            </Button>
          </div>

          {recentMovements.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
              No recent movements recorded.
            </div>
          ) : (
            <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Date &amp; Type</th>
                  <th>Item Details</th>
                  <th>Route / Location</th>
                  <th style={{ width: '60px', textAlign: 'right' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((m) => {
                  const badge = getMovementTypeBadge(m.movementType);
                  const Icon = badge.icon;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {new Date(m.movementDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            marginTop: '2px',
                          }}
                        >
                          <Icon size={11} /> {badge.label}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{m.firstItemName}</div>
                        {m.serialNumber && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#7C3AED' }}>
                            SN: {m.serialNumber}
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ color: '#334155' }}>
                          <span style={{ color: '#64748B' }}>To:</span> {m.toLocation}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{m.itemCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Delivery Orders */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
              Recent Delivery Orders
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/delivery/orders')}
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              View Orders <ArrowRight size={13} />
            </Button>
          </div>

          {recentDeliveryOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
              No delivery orders created yet.
            </div>
          ) : (
            <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>DO # / Date</th>
                  <th>Project &amp; Client</th>
                  <th style={{ width: '85px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveryOrders.map((doDoc) => (
                  <tr key={doDoc.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1' }}>
                        {doDoc.doNumber || `Draft #${doDoc.id}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {new Date(doDoc.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>
                        {doDoc.siteCode ? `[${doDoc.siteCode}] ` : ''}
                        {doDoc.projectName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{doDoc.clientName}</div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: doDoc.status === 'ISSUED' ? '#ECFDF5' : '#FFFBEB',
                          color: doDoc.status === 'ISSUED' ? '#059669' : '#D97706',
                          border: `1px solid ${doDoc.status === 'ISSUED' ? '#A7F3D0' : '#FDE68A'}`,
                        }}
                      >
                        {doDoc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

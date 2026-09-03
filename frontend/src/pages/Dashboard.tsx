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
  AlertTriangle,
  Wrench,
  PackageCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader, LoadingState, ErrorState, Button } from '../components/ui/index.js';
import { apiClient } from '../api/client.js';
import { MovementDetailModal } from '../components/history/MovementDetailModal.js';
import { DeliveryOrderDetailModal } from '../components/delivery/DeliveryOrderDetailModal.js';

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

  // Detail modals
  const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedDoId, setSelectedDoId] = useState<number | null>(null);
  const [isDoModalOpen, setIsDoModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res: any = await apiClient.get('/dashboard/summary');
      setData(res?.data || res);
    } catch (err: any) {
      console.error('Failed to load dashboard summary:', err);
      setErrorMsg(
        err?.response?.data?.message ||
          'Failed to load dashboard statistics. Please check your network and try again.',
      );
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
        <LoadingState text="Aggregating warehouse operations & inventory metrics..." />
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

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'INCOMING':
        return { label: 'Incoming', bg: '#ECFDF5', color: '#059669', icon: ArrowDownLeft };
      case 'OUTGOING':
        return { label: 'Outgoing', bg: '#EFF6FF', color: '#2250A1', icon: ArrowUpRight };
      case 'RETURN':
        return { label: 'Return', bg: '#F5F3FF', color: '#7C3AED', icon: RotateCcw };
      case 'ADJUSTMENT':
        return { label: 'Adjust', bg: '#FFFBEB', color: '#D97706', icon: SlidersHorizontal };
      default:
        return { label: 'Initial', bg: '#F3F4F6', color: '#4B5563', icon: Boxes };
    }
  };

  const attentionCards = [
    {
      label: 'Out of Stock',
      count: stockHealth.outOfStock,
      desc: 'Bulk inventory records depleted',
      icon: ShieldAlert,
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      onClick: () => navigate('/inventory?trackingType=bulk&status=Out%20of%20Stock'),
    },
    {
      label: 'Low Stock',
      count: stockHealth.lowStock,
      desc: `Items below threshold (≤ ${summary.lowStockThreshold} units)`,
      icon: AlertTriangle,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      onClick: () => navigate('/inventory?trackingType=bulk&status=Low%20Stock'),
    },
    {
      label: 'Under Repair',
      count: stockHealth.underRepair,
      desc: 'Faulty serialized devices needing maintenance',
      icon: Wrench,
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      onClick: () => navigate('/inventory?trackingType=serialized&status=Under%20Repair'),
    },
  ];

  const generalMetrics = [
    {
      label: 'Item Masters',
      value: summary.totalItems,
      unit: 'catalog items',
      icon: Boxes,
      onClick: () => navigate('/inventory'),
    },
    {
      label: 'Serialized Assets',
      value: summary.totalSerialized,
      unit: 'devices',
      icon: PackageCheck,
      onClick: () => navigate('/inventory?trackingType=serialized'),
    },
    {
      label: 'Bulk Warehouse Stock',
      value: summary.totalBulkStock,
      unit: 'units stored',
      icon: Layers,
      onClick: () => navigate('/inventory?trackingType=bulk'),
    },
    {
      label: 'Deployed at Sites',
      value: summary.deployedSerialized,
      unit: 'in field',
      icon: ArrowUpRight,
      onClick: () => navigate('/inventory?trackingType=serialized&status=Deploy'),
    },
    {
      label: 'Active Projects',
      value: summary.activeProjects,
      unit: 'active sites',
      icon: Briefcase,
      onClick: () => navigate('/projects?status=active'),
    },
  ];

  return (
    <div className="page-container" style={{ gap: '1.25rem' }}>
      <PageHeader
        title="Logistics Operations Dashboard"
        description="Real-time stock attention, inventory balance, and recent dispatch movements."
      />

      {/* 1. NEEDS ATTENTION SECTION */}
      <div>
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748B',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#DC2626',
              display: 'inline-block',
            }}
          />
          Needs Attention
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '12px',
          }}
        >
          {attentionCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={card.onClick}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${card.border}`,
                  borderLeft: `4px solid ${card.color}`,
                  borderRadius: '6px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 3px 6px -1px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: card.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={14} />
                    {card.label}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>
                    {card.desc}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: card.color,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: card.bg,
                  }}
                >
                  {card.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. GENERAL INVENTORY SITUATION (Compact Row) */}
      <div>
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748B',
            marginBottom: '8px',
          }}
        >
          Inventory Overview
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: '10px',
          }}
        >
          {generalMetrics.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={card.onClick}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
                    {card.label}
                  </span>
                  <Icon size={14} color="#94A3B8" />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                  {card.value}{' '}
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#94A3B8' }}>
                    {card.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. RECENT ACTIVITY (2-Column Compact Layout) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Recent Inventory Movements */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
              Recent Inventory Movements
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory/movements')}
              style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              View All <ArrowRight size={12} />
            </Button>
          </div>

          {recentMovements.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              No recent movements recorded.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="data-table" style={{ margin: 0, fontSize: '0.775rem', width: '100%', minWidth: '320px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px' }}>Date &amp; Type</th>
                    <th style={{ padding: '6px 10px' }}>Item Details</th>
                    <th style={{ padding: '6px 10px' }}>Destination</th>
                    <th style={{ width: '45px', textAlign: 'right', padding: '6px 10px' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((m) => {
                    const badge = getMovementTypeBadge(m.movementType);
                    const Icon = badge.icon;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => {
                          setSelectedMovementId(m.id);
                          setIsMovementModalOpen(true);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Click to view movement details"
                      >
                        <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            {new Date(m.movementDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              backgroundColor: badge.bg,
                              color: badge.color,
                              padding: '1px 4px',
                              borderRadius: '3px',
                              marginTop: '1px',
                            }}
                          >
                            <Icon size={10} /> {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: '6px 10px' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B' }}>{m.firstItemName}</div>
                          {m.serialNumber && (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#7C3AED' }}>
                              SN: {m.serialNumber}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '6px 10px', color: '#334155' }}>
                          {m.toLocation}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, padding: '6px 10px' }}>
                          {m.itemCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Delivery Orders */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
              Recent Delivery Orders
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/delivery-orders')}
              style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              View All <ArrowRight size={12} />
            </Button>
          </div>

          {recentDeliveryOrders.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              No delivery orders created yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="data-table" style={{ margin: 0, fontSize: '0.775rem', width: '100%', minWidth: '320px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 10px' }}>DO # / Date</th>
                    <th style={{ padding: '6px 10px' }}>Project &amp; Client</th>
                    <th style={{ width: '80px', textAlign: 'center', padding: '6px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveryOrders.map((doDoc) => (
                    <tr
                      key={doDoc.id}
                      onClick={() => {
                        setSelectedDoId(doDoc.id);
                        setIsDoModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view delivery order details"
                    >
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1' }}>
                          {doDoc.doNumber || `Draft #${doDoc.id}`}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {new Date(doDoc.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>
                          {doDoc.siteCode ? `[${doDoc.siteCode}] ` : ''}
                          {doDoc.projectName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{doDoc.clientName}</div>
                      </td>

                      <td style={{ textAlign: 'center', padding: '6px 10px' }}>
                        <span
                          className={`badge-pill ${
                            doDoc.status === 'ISSUED' ? 'badge-blue' : 'badge-yellow'
                          } badge-sm`}
                        >
                          {doDoc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modals for Interactive Activity Rows */}
      <MovementDetailModal
        isOpen={isMovementModalOpen}
        movementId={selectedMovementId}
        onClose={() => {
          setIsMovementModalOpen(false);
          setSelectedMovementId(null);
        }}
      />

      <DeliveryOrderDetailModal
        isOpen={isDoModalOpen}
        deliveryOrderId={selectedDoId}
        onClose={() => {
          setIsDoModalOpen(false);
          setSelectedDoId(null);
        }}
        onIssuedSuccess={() => fetchDashboardData()}
      />
    </div>
  );
};

export default Dashboard;

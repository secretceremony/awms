import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/index.js';

export interface RecentMovementItem {
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
}

export interface RecentDeliveryOrderItem {
  id: number;
  doNumber: string | null;
  projectName: string;
  siteCode: string | null;
  clientName: string;
  date: string;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  itemCount: number;
}

export interface DashboardRecentActivityProps {
  recentMovements: RecentMovementItem[];
  recentDeliveryOrders: RecentDeliveryOrderItem[];
  onSelectMovement: (id: number) => void;
  onSelectDeliveryOrder: (id: number) => void;
}

export const DashboardRecentActivity: React.FC<DashboardRecentActivityProps> = ({
  recentMovements,
  recentDeliveryOrders,
  onSelectMovement,
  onSelectDeliveryOrder,
}) => {
  const navigate = useNavigate();

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

  return (
    <div className="dashboard-activity-grid">
      {/* Recent Inventory Movements */}
      <div className="dashboard-activity-card">
        <div className="dashboard-activity-card-header">
          <h3 className="dashboard-activity-card-title">
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
          <div className="dashboard-activity-empty">
            No recent movements recorded.
          </div>
        ) : (
          <div className="dashboard-activity-table-wrapper">
            <table className="data-table dashboard-activity-table">
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
                      onClick={() => onSelectMovement(m.id)}
                      className="dashboard-clickable-row"
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
                          className="dashboard-movement-badge"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
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
      <div className="dashboard-activity-card">
        <div className="dashboard-activity-card-header">
          <h3 className="dashboard-activity-card-title">
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
          <div className="dashboard-activity-empty">
            No delivery orders created yet.
          </div>
        ) : (
          <div className="dashboard-activity-table-wrapper">
            <table className="data-table dashboard-activity-table">
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
                    onClick={() => onSelectDeliveryOrder(doDoc.id)}
                    className="dashboard-clickable-row"
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
  );
};

import { useState, useEffect } from 'react';
import {
  Boxes,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Truck,
  Activity,
} from 'lucide-react';
import { Card, EmptyState, StatusBadge } from '../components/ui/index.js';
import { apiClient } from '../api/client.js';

interface DashboardSummary {
  totalItems: number;
  totalBulkStock: number;
  totalSerializedItems: number;
  currentStock: number;
  incomingCount: number;
  outgoingCount: number;
  activeProjects: number;
  deliveryOrders: number;
  recentMovements: Array<{
    id: number;
    movementNumber: string;
    movementType: string;
    date: string;
    location: string;
    createdBy: string;
    itemCount: number;
    firstItemName: string;
  }>;
}

export const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res: any = await apiClient.get('/dashboard/summary');
        setSummary(res?.data || res);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const stats = [
    {
      label: 'Total Master Items',
      value: summary?.totalItems ?? 0,
      icon: Boxes,
      color: 'blue',
      description: 'Active catalog items',
    },
    {
      label: 'Current Total Stock',
      value: summary?.currentStock ?? 0,
      icon: Layers,
      color: 'cyan',
      description: `${summary?.totalBulkStock ?? 0} bulk + ${summary?.totalSerializedItems ?? 0} serialized`,
    },
    {
      label: 'Incoming Movements',
      value: summary?.incomingCount ?? 0,
      icon: ArrowDownLeft,
      color: 'green',
      description: 'Total incoming receipts',
    },
    {
      label: 'Outgoing Movements',
      value: summary?.outgoingCount ?? 0,
      icon: ArrowUpRight,
      color: 'yellow',
      description: 'Dispatches & deployments',
    },
    {
      label: 'Active Projects',
      value: summary?.activeProjects ?? 0,
      icon: Briefcase,
      color: 'blue',
      description: 'Customer project sites',
    },
    {
      label: 'Delivery Orders',
      value: summary?.deliveryOrders ?? 0,
      icon: Truck,
      color: 'red',
      description: 'Outbound logistics orders',
    },
  ];

  return (
    <div className="page-container">
      {/* Real Statistics Grid */}
      <div className="stats-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card">
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">
                  {isLoading ? '...' : stat.value.toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                  {stat.description}
                </span>
              </div>
              <div className={`stat-icon-wrapper color-${stat.color}`}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Table */}
      <div style={{ marginTop: '1.5rem' }}>
        <Card
          title="Recent Stock Movements"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
              <Activity size={14} /> Live Audit
            </div>
          }
        >
          {summary && summary.recentMovements && summary.recentMovements.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Movement No.</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Quantity</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentMovements.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1F2839' }}>
                          {m.movementNumber}
                        </span>
                      </td>
                      <td>
                        <StatusBadge
                          type="condition"
                          status={m.movementType}
                          label={m.movementType}
                        />
                      </td>
                      <td style={{ fontSize: '13px', color: '#4B5563' }}>
                        {new Date(m.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ fontWeight: 500 }}>{m.location}</td>
                      <td style={{ fontWeight: 600 }}>{m.itemCount}</td>
                      <td style={{ color: '#4B5563' }}>{m.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No Stock Movements Recorded"
              description="When inventory is initialized, received, or dispatched, recent movements will appear here in real time."
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

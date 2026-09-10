import React, { useState, useEffect } from 'react';
import { PageHeader, LoadingState, ErrorState } from '../components/ui/index.js';
import { apiClient } from '../api/client.js';
import { MovementDetailModal } from '../components/history/MovementDetailModal.js';
import { DeliveryOrderDetailModal } from '../components/delivery/DeliveryOrderDetailModal.js';
import {
  DashboardAttentionGrid,
  DashboardMetricsGrid,
  DashboardRecentActivity,
  type RecentMovementItem,
  type RecentDeliveryOrderItem,
} from '../components/dashboard/index.js';

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
  recentMovements: RecentMovementItem[];
  recentDeliveryOrders: RecentDeliveryOrderItem[];
}

export const Dashboard: React.FC = () => {
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

  return (
    <div className="page-container" style={{ gap: '1.25rem' }}>
      <PageHeader
        title="Logistics Operations Dashboard"
        description="Real-time stock attention, inventory balance, and recent dispatch movements."
      />

      {/* 1. Needs Attention */}
      <DashboardAttentionGrid
        stockHealth={stockHealth}
        lowStockThreshold={summary.lowStockThreshold}
      />

      {/* 2. Inventory Overview Metrics */}
      <DashboardMetricsGrid summary={summary} />

      {/* 3. Recent Activity */}
      <DashboardRecentActivity
        recentMovements={recentMovements}
        recentDeliveryOrders={recentDeliveryOrders}
        onSelectMovement={(id) => {
          setSelectedMovementId(id);
          setIsMovementModalOpen(true);
        }}
        onSelectDeliveryOrder={(id) => {
          setSelectedDoId(id);
          setIsDoModalOpen(true);
        }}
      />

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

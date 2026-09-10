import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, PackageCheck, Layers, ArrowUpRight, Briefcase } from 'lucide-react';

export interface DashboardSummaryData {
  totalItems: number;
  totalBulkStock: number;
  totalSerialized: number;
  deployedSerialized: number;
  underRepairSerialized: number;
  activeProjects: number;
  draftDeliveryOrders: number;
  issuedDeliveryOrders: number;
  lowStockThreshold: number;
}

export interface DashboardMetricsGridProps {
  summary: DashboardSummaryData;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({ summary }) => {
  const navigate = useNavigate();

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
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        Inventory Overview
      </div>

      <div className="dashboard-metrics-grid">
        {generalMetrics.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="dashboard-metric-card"
            >
              <div className="dashboard-metric-card-header">
                <span className="dashboard-metric-card-label">
                  {card.label}
                </span>
                <Icon size={14} className="dashboard-metric-card-icon" />
              </div>
              <div className="dashboard-metric-card-value">
                {card.value}{' '}
                <span className="dashboard-metric-card-unit">
                  {card.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Wrench } from 'lucide-react';

export interface StockHealthData {
  normal: number;
  lowStock: number;
  outOfStock: number;
  underRepair: number;
  deployed: number;
}

export interface DashboardAttentionGridProps {
  stockHealth: StockHealthData;
  lowStockThreshold: number;
}

export const DashboardAttentionGrid: React.FC<DashboardAttentionGridProps> = ({
  stockHealth,
  lowStockThreshold,
}) => {
  const navigate = useNavigate();

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
      desc: `Items below threshold (≤ ${lowStockThreshold} units)`,
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

  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <span className="dashboard-attention-dot" />
        Needs Attention
      </div>

      <div className="dashboard-attention-grid">
        {attentionCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="dashboard-attention-card"
              style={{
                borderColor: card.border,
                borderLeftColor: card.color,
              }}
            >
              <div>
                <div
                  className="dashboard-attention-card-header"
                  style={{ color: card.color }}
                >
                  <Icon size={14} />
                  {card.label}
                </div>
                <div className="dashboard-attention-card-desc">
                  {card.desc}
                </div>
              </div>

              <div
                className="dashboard-attention-card-count"
                style={{
                  color: card.color,
                  backgroundColor: card.bg,
                }}
              >
                {card.count}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

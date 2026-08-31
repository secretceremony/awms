import { Boxes, Warehouse, Truck, AlertCircle } from 'lucide-react';
import './Pages.css';

export const Dashboard = () => {
  const stats = [
    { label: 'Total Items', value: '1,248', icon: Boxes, color: 'blue' },
    { label: 'Total Warehouses', value: '4', icon: Warehouse, color: 'cyan' },
    { label: 'Pending Deliveries', value: '12', icon: Truck, color: 'yellow' },
    { label: 'Low Stock Alerts', value: '3', icon: AlertCircle, color: 'red' },
  ];

  return (
    <div className="page-container">
      <div className="stats-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card">
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
              <div className={`stat-icon-wrapper color-${stat.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-content-grid">
        <div className="content-card">
          <h3>Welcome to ALSSA Warehouse Management System</h3>
          <p>
            This system helps you track serial and bulk inventory items, manage warehouse stock distributions,
            process outbound delivery orders, and monitor system activities.
          </p>
          <div className="action-links">
            <span className="info-text">Select an option from the sidebar menu to start.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

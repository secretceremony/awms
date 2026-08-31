import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse,
  Truck,
  Tag,
  Users,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import './DashboardLayout.css';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'header', label: 'Inventory' },
    { to: '/inventory', label: 'Stock List', icon: Boxes },
    { to: '/inventory/incoming', label: 'Incoming Stock', icon: ArrowDownLeft },
    { to: '/inventory/outgoing', label: 'Outgoing Stock', icon: ArrowUpRight },
    { type: 'header', label: 'Master Data' },
    { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
    { to: '/customers', label: 'Customers', icon: Users },
    { type: 'header', label: 'Deliveries' },
    { to: '/delivery-orders', label: 'Delivery Orders', icon: Truck },
    { to: '/shipping-labels', label: 'Shipping Labels', icon: Tag },
    { type: 'header', label: 'System' },
    { to: '/logs', label: 'Activity Logs', icon: FileText },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="dashboard-container">
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <div className="mobile-logo-section">
          <div className="logo-box">A</div>
          <span>ALSSA WMS</span>
        </div>
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo-section">
          <div className="logo-cube">A</div>
          <div className="logo-text">
            <h2>ALSSA WMS</h2>
            <p>Warehouse System</p>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item, idx) => {
            if (item.type === 'header') {
              return (
                <div key={`header-${idx}`} className="nav-header">
                  {item.label}
                </div>
              );
            }
            const Icon = item.icon!;
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">
                {user?.role === 'ADMIN_LOGISTICS'
                  ? 'Logistics Admin'
                  : user?.role || 'Guest'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content-layout">
        <header className="content-header">
          <div className="header-title-area">
            <div className="breadcrumb">
              ALSSA WMS &nbsp;/&nbsp; {navItems.find((item) => item.to === window.location.pathname)?.label || 'Panel'}
            </div>
            <h1>
              {navItems.find((item) => item.to === window.location.pathname)?.label || 'AWMS Panel'}
            </h1>
          </div>
          <div className="header-meta">
            <span className="badge">Active Session</span>
          </div>
        </header>
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

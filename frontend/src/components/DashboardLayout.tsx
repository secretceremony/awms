import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  User,
  Ruler,
  Briefcase,
  History
} from 'lucide-react';
import { Button } from './ui/index.js';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    { to: '/inventory/movements', label: 'Movement History', icon: History },
    { to: '/inventory/outgoing', label: 'Outgoing Stock', icon: ArrowUpRight },
    { type: 'header', label: 'Master Data' },
    { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/units', label: 'Units', icon: Ruler },
    { type: 'header', label: 'Deliveries' },
    { to: '/delivery-orders', label: 'Delivery Orders', icon: Truck },
    { to: '/shipping-labels', label: 'Shipping Labels', icon: Tag },
    { type: 'header', label: 'System' },
    { to: '/logs', label: 'Activity Logs', icon: FileText },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const currentNav = navItems.find((item) => item.to === location.pathname);

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-text">
            <h2>AWMS</h2>
            <p>Warehouse Management</p>
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
              <span className="user-name">{user?.name || user?.email || 'User'}</span>
              <span className="user-role">
                {user?.role === 'ADMIN_LOGISTICS'
                  ? 'Logistics Admin'
                  : user?.role || 'Staff'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content-layout">
        <header className="content-header">
          <div className="header-title-area">
            <div className="breadcrumb" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
              AWMS &nbsp;/&nbsp; {currentNav?.label || 'Overview'}
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1F2839' }}>
              {currentNav?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="header-user-section" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2839' }}>
              {user?.name || user?.email || 'User'}
            </span>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              <LogOut size={14} /> Logout
            </Button>
          </div>
        </header>
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

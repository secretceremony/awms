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
  Briefcase,
  History,
} from 'lucide-react';
import { Button } from './ui/index.js';
import { canAccessSettings, canAccessLogs } from '../utils/permissions.js';

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
    { type: 'header', label: 'Master Data' },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { type: 'header', label: 'Inventory' },
    { to: '/inventory', label: 'Stock List', icon: Boxes },
    { to: '/inventory/incoming', label: 'Incoming', icon: ArrowDownLeft },
    { to: '/inventory/outgoing', label: 'Outgoing', icon: ArrowUpRight },
    { to: '/inventory/movements', label: 'Movement History', icon: History },
    { type: 'header', label: 'Deliveries' },
    { to: '/delivery-orders', label: 'Delivery Orders', icon: Truck },
    { to: '/shipping-labels', label: 'Shipping Labels', icon: Tag },
    ...((canAccessLogs(user?.role) || canAccessSettings(user?.role))
      ? [{ type: 'header', label: 'System' }]
      : []),
    ...(canAccessLogs(user?.role)
      ? [{ to: '/logs', label: 'Activity Logs', icon: FileText }]
      : []),
    ...(canAccessSettings(user?.role)
      ? [{ to: '/settings', label: 'Settings', icon: SettingsIcon }]
      : []),
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
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Identity and Logout in Sidebar */}
        <div className="sidebar-footer">
          <Button
            variant="danger"
            size="sm"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={handleLogout}
          >
            <LogOut size={15} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content-layout">
        <header className="content-header">
          <div className="header-title-area">
            <div className="breadcrumb">
              AWMS &nbsp;/&nbsp; {currentNav?.label || 'Overview'}
            </div>
            <h1 className="header-page-title">
              {currentNav?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="header-user-section">
            <User size={15} />
            <span>{user?.name || user?.email || 'User'}</span>
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

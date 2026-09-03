import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLE_MAP: Record<string, string> = {
  '/': 'Dashboard | AWMS',
  '/login': 'Login | AWMS',
  '/inventory': 'Stock List | AWMS',
  '/inventory/incoming': 'Incoming | AWMS',
  '/inventory/outgoing': 'Outgoing | AWMS',
  '/inventory/movements': 'Movement History | AWMS',
  '/warehouses': 'Warehouses | AWMS',
  '/projects': 'Projects | AWMS',
  '/clients': 'Clients | AWMS',
  '/delivery-orders': 'Delivery Orders | AWMS',
  '/shipping-labels': 'Shipping Labels | AWMS',
  '/logs': 'Activity Logs | AWMS',
  '/settings': 'Settings | AWMS',
};

function getPageTitle(pathname: string): string {
  // Exact match
  if (ROUTE_TITLE_MAP[pathname]) {
    return ROUTE_TITLE_MAP[pathname];
  }

  // Dynamic route patterns
  if (pathname.startsWith('/inventory/item/')) {
    return 'Item Detail | AWMS';
  }
  if (pathname.startsWith('/inventory/incoming/')) {
    return 'Incoming Detail | AWMS';
  }

  // Generic fallback
  return 'AWMS';
}

export function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    document.title = getPageTitle(location.pathname);
  }, [location.pathname]);

  return null;
}

export default PageTitleUpdater;

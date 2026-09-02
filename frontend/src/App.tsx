import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { DashboardLayout } from './components/DashboardLayout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { StockList } from './pages/Inventory/StockList.js';
import { ItemDetail } from './pages/Inventory/ItemDetail.js';
import { Incoming } from './pages/Inventory/Incoming.js';
import { IncomingDetail } from './pages/Inventory/IncomingDetail.js';
import { MovementHistory } from './pages/Inventory/MovementHistory.js';
import { Outgoing } from './pages/Inventory/Outgoing.js';
import { Warehouses } from './pages/Warehouses.js';
import { Projects } from './pages/Projects.js';
import { Clients } from './pages/Clients.js';
import { Units } from './pages/Units.js';
import { Orders } from './pages/Delivery/Orders.js';
import { Labels } from './pages/Delivery/Labels.js';
import { Logs } from './pages/Logs.js';
import { Settings } from './pages/Settings.js';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<StockList />} />
              <Route path="/inventory/item/:id" element={<ItemDetail />} />

              <Route path="/inventory/incoming" element={<Incoming />} />
              <Route path="/inventory/incoming/:id" element={<IncomingDetail />} />
              <Route path="/inventory/movements" element={<MovementHistory />} />
              <Route path="/inventory/outgoing" element={<Outgoing />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/customers" element={<Clients />} />
              <Route path="/units" element={<Units />} />
              <Route path="/delivery-orders" element={<Orders />} />
              <Route path="/shipping-labels" element={<Labels />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

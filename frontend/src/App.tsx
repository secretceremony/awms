import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { DashboardLayout } from './components/DashboardLayout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { StockList } from './pages/Inventory/StockList.js';
import { Incoming } from './pages/Inventory/Incoming.js';
import { Outgoing } from './pages/Inventory/Outgoing.js';
import { Warehouses } from './pages/Warehouses.js';
import { Customers } from './pages/Customers.js';
import { Units } from './pages/Units.js';
import { Orders } from './pages/Delivery/Orders.js';
import { Labels } from './pages/Delivery/Labels.js';
import { Logs } from './pages/Logs.js';
import { Settings } from './pages/Settings.js';
import './App.css';

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
              <Route path="/inventory/incoming" element={<Incoming />} />
              <Route path="/inventory/outgoing" element={<Outgoing />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/customers" element={<Customers />} />
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

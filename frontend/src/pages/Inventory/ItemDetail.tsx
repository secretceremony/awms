import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { PageHeader, Button, Card, StatusBadge } from '../../components/ui/index.js';
import { ArrowLeft, Edit2, RotateCcw, Boxes, Warehouse, Briefcase } from 'lucide-react';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';

interface ItemSerial {
  id: number;
  serialNumber: string;
  state: string;
  conditionLabel: string | null;
  notes: string | null;
  currentWarehouse?: { id: number; name: string; cityCode?: string | null };
  currentProject?: { id: number; name: string; siteCode?: string | null; location?: string | null };
}

interface WarehouseStockBalance {
  id: number;
  warehouseId: number;
  quantity: number;
  warehouse: { id: number; name: string; cityCode?: string | null; city?: string | null; location: string };
}

interface ProjectStockBalance {
  id: number;
  projectId: number;
  quantity: number;
  project: {
    id: number;
    name: string;
    siteCode?: string | null;
    location: string;
    client?: { id: number; name: string };
  };
}

interface ItemBalanceResponse {
  itemId: number;
  itemName: string;
  trackingType: 'BULK' | 'SERIALIZED';
  unit: string;
  totalQuantity: number;
  totalWarehouseQuantity?: number;
  totalProjectQuantity?: number;
  inWarehouseQuantity?: number;
  deployedQuantity?: number;
  standbyGoodQuantity?: number;
  underRepairQuantity?: number;
  warehouseStocks?: WarehouseStockBalance[];
  projectStocks?: ProjectStockBalance[];
}

export const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [balanceData, setBalanceData] = useState<ItemBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchItemData = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [itemRes, balancesRes]: any = await Promise.all([
        apiClient.get(`/items/${id}`),
        apiClient.get(`/items/${id}/balances`),
      ]);
      setItem(itemRes?.data || itemRes);

      // Support structured balance response or legacy array
      if (Array.isArray(balancesRes)) {
        setBalanceData({
          itemId: Number(id),
          itemName: itemRes?.name || '',
          trackingType: itemRes?.trackingType || 'BULK',
          unit: itemRes?.unit?.symbol || 'pcs',
          totalQuantity: balancesRes.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0),
          warehouseStocks: balancesRes,
          projectStocks: [],
        });
      } else {
        setBalanceData(balancesRes?.data || balancesRes);
      }
    } catch (err: any) {
      console.error('Failed to load item detail or balances:', err);
      setErrorMsg('Unable to load current inventory for this item.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItemData();
  }, [id, refreshKey]);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="table-loading" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <p style={{ color: '#64748B' }}>Loading item details &amp; inventory balances...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !item) {
    return (
      <div className="page-container">
        <div style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '1.5rem' }}>
          <p style={{ color: '#DC2626', fontWeight: 600, fontSize: '0.95rem', margin: '0 0 1rem' }}>
            {errorMsg || 'Item not found in inventory catalog.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => fetchItemData()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RotateCcw size={14} /> Retry
            </Button>
            <Button variant="primary" onClick={() => navigate('/inventory')}>
              Back to Stock List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const serialColumns: Column<ItemSerial>[] = [
    {
      header: 'Serial Number',
      key: 'serialNumber',
      render: (s) => (
        <code
          style={{
            backgroundColor: '#F3F4F6',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #E5E7EB',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: '#1E293B',
          }}
        >
          {s.serialNumber}
        </code>
      ),
    },
    {
      header: 'Condition / Health',
      key: 'condition',
      render: (s) => (
        <StatusBadge
          status={s.conditionLabel || s.state}
        />
      ),
    },
    {
      header: 'Current Location',
      key: 'currentLocation',
      render: (s) => {
        if (s.currentProject) {
          return (
            <span style={{ fontWeight: 600, color: '#0369A1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Briefcase size={13} /> {s.currentProject.siteCode ? `[${s.currentProject.siteCode}] ` : ''}{s.currentProject.name}
            </span>
          );
        }
        if (s.currentWarehouse) {
          return (
            <span style={{ fontWeight: 600, color: '#1E293B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Warehouse size={13} color="#2250A1" /> {s.currentWarehouse.cityCode || s.currentWarehouse.name}
            </span>
          );
        }
        return <span style={{ color: '#9CA3AF' }}>—</span>;
      },
    },
    {
      header: 'Allocation Status',
      key: 'status',
      render: (s) => {
        if (s.currentProject) {
          return <StatusBadge status="Deploy" />;
        }
        return <StatusBadge status={s.state} />;
      },
    },
    {
      header: 'Notes / Remarks',
      key: 'notes',
      render: (s) => (
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {s.notes || '—'}
        </span>
      ),
    },
  ];

  const unitDisplay = item.unit?.symbol || item.unit?.name || '-';
  const warehouseBalances = balanceData?.warehouseStocks || [];
  const projectBalances = balanceData?.projectStocks || [];
  const totalStock = balanceData?.totalQuantity ?? 0;

  return (
    <div className="page-container" style={{ gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Stock List
        </Button>
      </div>

      <PageHeader
        title={item.name}
        description={`Brand: ${item.brand || 'N/A'} • MN: ${item.modelNumber || 'N/A'} • Tracking: ${item.trackingType}`}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <StatusBadge status={item.isActive} />
            <Button variant="primary" size="sm" onClick={() => setIsEditModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={14} /> Edit Item
            </Button>
          </div>
        }
      />

      {/* Item Master Summary Card */}
      <Card title="Item Master Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Brand</span>
            <p style={{ fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>{item.brand || '—'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Model Number</span>
            <p style={{ fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>{item.modelNumber || '—'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Tracking Type</span>
            <div style={{ marginTop: '4px' }}><StatusBadge type="tracking" status={item.trackingType} /></div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Unit of Measure</span>
            <p style={{ fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>{unitDisplay}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Quantity</span>
            <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2250A1', margin: '2px 0 0' }}>
              {totalStock} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748B' }}>{unitDisplay}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* BULK INVENTORY VIEW */}
      {item.trackingType === 'BULK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Warehouse Stocks Distribution */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Warehouse size={18} color="#2250A1" />
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                Warehouse Stock Distribution ({warehouseBalances.reduce((s, w) => s + w.quantity, 0)} {unitDisplay})
              </h3>
            </div>

            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Warehouse Hub</th>
                    <th>City / Location</th>
                    <th style={{ textAlign: 'right', width: '140px' }}>Quantity on Hand</th>
                    <th style={{ width: '80px' }}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseBalances.length > 0 ? (
                    warehouseBalances.map((ws) => (
                      <tr key={ws.id}>
                        <td style={{ fontWeight: 600, color: '#1F2839' }}>
                          {ws.warehouse.name}
                        </td>
                        <td style={{ color: '#4B5563' }}>
                          {ws.warehouse.cityCode ? `[${ws.warehouse.cityCode}] ` : ''}{ws.warehouse.location || ws.warehouse.city || '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#1E293B' }}>
                          {ws.quantity}
                        </td>
                        <td style={{ color: '#6B7280' }}>{unitDisplay}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: '1.5rem' }}>
                        No physical stock in any warehouse.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Project Site Allocations if deployed */}
          {projectBalances.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} color="#0284C7" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0369A1' }}>
                  Client Project Site Allocations ({projectBalances.reduce((s, p) => s + p.quantity, 0)} {unitDisplay})
                </h3>
              </div>

              <div className="table-container" style={{ margin: 0 }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Project / Site</th>
                      <th>Client Company</th>
                      <th>Site Location</th>
                      <th style={{ textAlign: 'right', width: '140px' }}>Allocated Qty</th>
                      <th style={{ width: '80px' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectBalances.map((ps) => (
                      <tr key={ps.id}>
                        <td style={{ fontWeight: 600, color: '#1E293B' }}>
                          {ps.project.siteCode ? `[${ps.project.siteCode}] ` : ''}{ps.project.name}
                        </td>
                        <td style={{ color: '#4B5563' }}>
                          {ps.project.client?.name || '—'}
                        </td>
                        <td style={{ color: '#4B5563' }}>
                          {ps.project.location || '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>
                          {ps.quantity}
                        </td>
                        <td style={{ color: '#6B7280' }}>{unitDisplay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIALIZED INVENTORY VIEW */}
      {item.trackingType === 'SERIALIZED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Total Devices</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                {balanceData?.totalQuantity ?? 0}
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>In Warehouse (Ready)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {balanceData?.standbyGoodQuantity ?? balanceData?.inWarehouseQuantity ?? 0}
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2250A1' }}>Deployed to Sites</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2250A1', marginTop: '2px' }}>
                {balanceData?.deployedQuantity ?? 0}
              </div>
            </div>
            {(balanceData?.underRepairQuantity ?? 0) > 0 && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#DC2626' }}>Under Repair</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                  {balanceData?.underRepairQuantity}
                </div>
              </div>
            )}
          </div>

          {/* Serialized Item Serials List */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <Boxes size={18} color="#2250A1" />
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                Current Serialized Assets &amp; Allocations
              </h3>
            </div>
            <PaginatedTable<ItemSerial>
              key={`item-serials-${item.id}-${refreshKey}`}
              fetchUrl={`/items/${item.id}/serials`}
              searchPlaceholder="Search serial numbers..."
              columns={serialColumns}
              emptyMessage="No serialized units registered for this item yet."
            />
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      <ItemFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={item}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default ItemDetail;

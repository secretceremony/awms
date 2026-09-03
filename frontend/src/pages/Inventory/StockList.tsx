import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, Layers, Edit2, SlidersHorizontal, Download, Loader2 } from 'lucide-react';
import { Button, PageHeader, Select, StatusBadge, SegmentedControl } from '../../components/ui/index.js';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';
import { InitialStockModal } from '../../components/inventory/InitialStockModal.js';
import { AdjustmentModal } from '../../components/history/AdjustmentModal.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';
import { downloadAllDataWorkbook } from '../../utils/exportWorkbook.js';


interface StockRow {
  id: string;
  itemId: number;
  warehouseId?: number | null;
  registeredDate: string;
  location: string;
  locationType: 'WAREHOUSE' | 'PROJECT';
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string;
  trackingType: 'BULK' | 'SERIALIZED';
  quantity: number;
  unit: string;
  unitSymbol: string;
  condition: string;
  currentStatus: string;
  notes: string;
}

interface ItemSummaryData {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unit: { name: string; symbol: string | null };
  totalWarehouseQuantity: number;
  totalDeployedQuantity: number;
  totalUnderRepairQuantity: number;
  totalStandbyBadQuantity: number;
  totalAll: number;
}

export const StockList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const trackingType = searchParams.get('trackingType') || 'all';
  const warehouseId = searchParams.get('warehouseId') || '';
  const statusFilter = searchParams.get('status') || 'all';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; cityCode?: string | null }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Item Summary state
  const [itemSummary, setItemSummary] = useState<ItemSummaryData | null>(null);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustContext, setAdjustContext] = useState<{ itemId: number | null; warehouseId: number | null }>({
    itemId: null,
    warehouseId: null,
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      await downloadAllDataWorkbook();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res: any = await apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } });
        setWarehouses(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load warehouses for filter:', err);
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch Item Aggregate Summary when a specific item search is performed
  useEffect(() => {
    const fetchItemSummary = async () => {
      const trimmed = search.trim();
      if (!trimmed || trimmed.length < 2) {
        setItemSummary(null);
        return;
      }

      try {
        const res: any = await apiClient.get('/items', { params: { search: trimmed, limit: 1 } });
        const items = res?.data || (Array.isArray(res) ? res : []);
        if (items && items.length === 1) {
          const item = items[0];
          // Calculate aggregate breakdown
          const detailsRes: any = await apiClient.get(`/items/${item.id}`);
          const fullItem = detailsRes?.data || detailsRes;

          let whQty = 0;
          let deployQty = 0;
          let repairQty = 0;
          let badQty = 0;

          if (fullItem.trackingType === 'BULK') {
            whQty = (fullItem.warehouseStocks || []).reduce((acc: number, ws: any) => acc + (ws.quantity || 0), 0);
            deployQty = (fullItem.projectStocks || []).reduce((acc: number, ps: any) => acc + (ps.quantity || 0), 0);
          } else {
            (fullItem.serials || []).forEach((s: any) => {
              if (s.state === 'DEPLOY') deployQty++;
              else if (s.state === 'UNDER_REPAIR') repairQty++;
              else if (s.state === 'STANDBY_BAD') badQty++;
              else if (s.state === 'STANDBY_GOOD' || s.currentWarehouseId) whQty++;
            });
          }

          setItemSummary({
            id: fullItem.id,
            name: fullItem.name,
            brand: fullItem.brand,
            modelNumber: fullItem.modelNumber,
            trackingType: fullItem.trackingType,
            unit: fullItem.unit || { name: 'units', symbol: 'pcs' },
            totalWarehouseQuantity: whQty,
            totalDeployedQuantity: deployQty,
            totalUnderRepairQuantity: repairQty,
            totalStandbyBadQuantity: badQty,
            totalAll: whQty + deployQty + repairQty + badQty,
          });
        } else {
          setItemSummary(null);
        }
      } catch (err) {
        console.error('Failed to load item summary:', err);
        setItemSummary(null);
      }
    };

    fetchItemSummary();
  }, [search]);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    if (!('page' in updates)) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
    setItemSummary(null);
  };

  const activeFilters: ActiveFilter[] = [];
  if (trackingType && trackingType !== 'all') {
    activeFilters.push({
      key: 'trackingType',
      label: 'Tracking',
      valueDisplay: trackingType === 'bulk' ? 'BULK ONLY' : 'SERIALIZED ONLY',
      onClear: () => updateFilters({ trackingType: null }),
    });
  }
  if (statusFilter && statusFilter !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      valueDisplay: statusFilter.toUpperCase(),
      onClear: () => updateFilters({ status: null }),
    });
  }
  if (warehouseId) {
    const matchedWh = warehouses.find((w) => String(w.id) === warehouseId);
    activeFilters.push({
      key: 'warehouseId',
      label: 'Warehouse',
      valueDisplay: matchedWh ? (matchedWh.cityCode || matchedWh.name) : `WH #${warehouseId}`,
      onClear: () => updateFilters({ warehouseId: null }),
    });
  }

  const handleEditItem = async (itemId: number) => {
    try {
      const res: any = await apiClient.get(`/items/${itemId}`);
      const itemData = res?.data || res;
      setEditingItem(itemData);
      setIsItemModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch item for edit:', err);
    }
  };

  const columns: Column<StockRow>[] = [
    {
      header: 'Item & Model',
      key: 'itemName',
      render: (r) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className={`badge-pill ${
                r.trackingType === 'SERIALIZED' ? 'tracking-serialized' : 'tracking-bulk'
              } badge-sm`}
            >
              {r.trackingType === 'SERIALIZED' ? 'SERIAL' : 'BULK'}
            </span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>{r.itemName}</span>
          </div>
          {(r.brand || r.modelNumber) && (
            <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '1px' }}>
              {r.brand && `${r.brand} `}
              {r.modelNumber && `[MN: ${r.modelNumber}]`}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Serial Number',
      key: 'serialNumber',
      render: (r) =>
        r.serialNumber && r.serialNumber !== '-' ? (
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#2250A1',
              backgroundColor: '#EFF6FF',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #BFDBFE',
              fontSize: '0.8rem',
            }}
          >
            {r.serialNumber}
          </span>
        ) : (
          <span style={{ color: '#94A3B8' }}>—</span>
        ),
    },
    {
      header: 'Current Location',
      key: 'location',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#334155' }}>
          {r.location || '—'}
        </span>
      ),
    },
    {
      header: 'Available Qty',
      key: 'quantity',
      render: (r) => (
        <span style={{ fontWeight: 700, color: '#1E293B' }}>
          {r.quantity}{' '}
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>
            {r.unitSymbol || r.unit || 'pcs'}
          </span>
        </span>
      ),
    },
    {
      header: 'Condition',
      key: 'condition',
      render: (r) =>
        r.trackingType === 'SERIALIZED' && r.condition && r.condition !== '-' ? (
          <StatusBadge status={r.condition} size="sm" />
        ) : (
          <span style={{ color: '#94A3B8' }}>—</span>
        ),
    },
    {
      header: 'Stock Status',
      key: 'currentStatus',
      render: (r) => (
        <StatusBadge
          status={r.currentStatus}
          size="sm"
        />
      ),
    },
    {
      header: 'Registered',
      key: 'registeredDate',
      render: (r) => (
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
          {new Date(r.registeredDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inventory/item/${r.itemId}`);
            }}
            title="View Item Master Details"
            style={{ padding: '3px 6px' }}
          >
            <Eye size={14} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditItem(r.itemId);
            }}
            title="Edit Item Master"
            style={{ padding: '3px 6px' }}
          >
            <Edit2 size={14} />
          </Button>

          {r.locationType === 'WAREHOUSE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const wh = warehouses.find(
                  (w) => r.location.includes(w.name) || (w.cityCode && r.location.includes(w.cityCode)),
                );
                setAdjustContext({
                  itemId: r.itemId,
                  warehouseId: r.warehouseId || wh?.id || null,
                });
                setIsAdjustModalOpen(true);
              }}
              title="Adjust Physical Balance / Condition"
              style={{ padding: '3px 6px' }}
            >
              <SlidersHorizontal size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const exactMatchClassName = (r: StockRow) => {
    const trimmed = search.trim();
    if (trimmed && r.serialNumber && r.serialNumber.toLowerCase() === trimmed.toLowerCase()) {
      return 'row-exact-match';
    }
    return '';
  };

  return (
    <div className="page-container" style={{ gap: '1rem' }}>
      <PageHeader
        title="Stock List"
        description="Physical multi-warehouse stock balances, serialized asset tracking, and site allocations."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={isExporting}
              onClick={handleExportAll}
              title="Export all data to Excel workbook (.xlsx)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {isExporting ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
              {isExporting ? 'Exporting...' : 'Export All (.xlsx)'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsInitialStockModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={15} /> Initial Stock
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} /> + Add Item Master
            </Button>
          </div>
        }
      />

      {/* Primary Search & Tracking Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search item name, brand, model, or scan SN..."
        primaryFilter={
          <div style={{ width: '280px' }}>
            <SegmentedControl
              options={[
                { value: 'all', label: 'All Inventory' },
                { value: 'bulk', label: 'Bulk Only' },
                { value: 'serialized', label: 'Serialized' },
              ]}
              value={trackingType}
              onChange={(val) => updateFilters({ trackingType: val })}
            />
          </div>
        }
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
        <div style={{ width: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Stock Status
          </label>
          <Select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
          >
            <option value="all">All Statuses</option>
            <option value="Normal">Normal Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Deploy">Deploy (at Site)</option>
            <option value="In Warehouse">In Warehouse</option>
            <option value="Standby Good">Standby Good</option>
            <option value="Standby Bad">Standby Bad</option>
            <option value="Under Repair">Under Repair</option>
          </Select>
        </div>

        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Warehouse Location
          </label>
          <Select
            value={warehouseId}
            onChange={(e) => updateFilters({ warehouseId: e.target.value })}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.cityCode || w.name} ({w.name})
              </option>
            ))}
          </Select>
        </div>
      </FilterPanel>

      {/* Lightweight Item Aggregate Summary Strip (When searching an item) */}
      {itemSummary && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #BFDBFE',
            borderLeft: '4px solid #2250A1',
            borderRadius: '6px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2250A1', textTransform: 'uppercase' }}>
                Item Summary
              </span>
              <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                {itemSummary.name}
              </span>
              {itemSummary.brand && (
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  ({itemSummary.brand})
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Tracking: <strong>{itemSummary.trackingType}</strong> &bull; Unit: {itemSummary.unit.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Total Inventory</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>
                {itemSummary.totalAll}
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0' }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>In Warehouse</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                {itemSummary.totalWarehouseQuantity}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#2250A1', fontWeight: 600 }}>Deployed (Site)</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2250A1' }}>
                {itemSummary.totalDeployedQuantity}
              </div>
            </div>

            {itemSummary.trackingType === 'SERIALIZED' && (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>Under Repair</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626' }}>
                    {itemSummary.totalUnderRepairQuantity}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>Standby Bad</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626' }}>
                    {itemSummary.totalStandbyBadQuantity}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Paginated Table */}
      <PaginatedTable<StockRow>
        fetchUrl="/stocks"
        searchPlaceholder="Search item, brand, MN, SN..."
        columns={columns}
        rowClassName={exactMatchClassName}
        onRowClick={(r) => navigate(`/inventory/item/${r.itemId}`)}
        emptyMessage="No stock records found matching current search and filters."
        extraParams={{
          trackingType: trackingType !== 'all' ? trackingType : undefined,
          warehouseId: warehouseId || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search || undefined,
          _refresh: refreshKey,
        }}
      />

      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={editingItem}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <InitialStockModal
        isOpen={isInitialStockModalOpen}
        onClose={() => setIsInitialStockModalOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <AdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustContext({ itemId: null, warehouseId: null });
        }}
        initialItemId={adjustContext.itemId}
        initialWarehouseId={adjustContext.warehouseId}
        lockContext={Boolean(adjustContext.itemId)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
};

export default StockList;

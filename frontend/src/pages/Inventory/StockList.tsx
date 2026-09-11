import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { Plus, Layers, Download, Upload, Calendar, Loader2 } from 'lucide-react';
import { Button, PageHeader } from '../../components/ui/index.js';
import { ItemFormModal, type Item } from '../../components/inventory/ItemFormModal.js';
import { InitialStockModal } from '../../components/inventory/InitialStockModal.js';
import { AdjustmentModal } from '../../components/history/AdjustmentModal.js';
import { ExcelImportModal } from '../../components/common/ExcelImportModal.js';
import { MonthlyReportModal } from '../../components/common/MonthlyReportModal.js';
import type { ActiveFilter } from '../../components/filters/index.js';
import { downloadAllDataWorkbook } from '../../utils/exportWorkbook.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { canManageInventory } from '../../utils/permissions.js';
import {
  StockSummaryBar,
  StockFilterBar,
  StockTable,
  type ItemSummaryData,
  type WarehouseOption,
} from '../../components/inventory/stock/index.js';

export const StockList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const { showToast } = useToast();

  // URL state
  const search = searchParams.get('search') || '';
  const trackingType = searchParams.get('trackingType') || 'all';
  const materialType = searchParams.get('materialType') || 'all';
  const warehouseId = searchParams.get('warehouseId') || '';
  const statusFilter = searchParams.get('status') || 'all';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Item Summary state
  const [itemSummary, setItemSummary] = useState<ItemSummaryData | null>(null);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState(false);
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
      showToast({ type: 'success', message: 'Data export downloaded successfully' });
    } catch (err: any) {
      console.error(err);
      showToast({ type: 'error', message: err.message || 'Export failed' });
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
            materialType: fullItem.materialType,
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
  if (materialType && materialType !== 'all') {
    activeFilters.push({
      key: 'materialType',
      label: 'Type',
      valueDisplay: materialType.replace('_', ' ').toUpperCase(),
      onClear: () => updateFilters({ materialType: null }),
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

  const handleAdjustStock = (context: { itemId: number; warehouseId: number | null }) => {
    setAdjustContext(context);
    setIsAdjustModalOpen(true);
  };

  return (
    <div className="page-container" style={{ gap: '1rem' }}>
      <PageHeader
        title="Stock List"
        description="Physical multi-warehouse stock balances, serialized asset tracking, and site allocations."
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsMonthlyReportModalOpen(true)}
              title="Generate Monthly Operational Report (.xlsx)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={15} /> Monthly Report
            </Button>
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
            {canManage && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  title="Import initial stock via Excel (.xlsx)"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={15} /> Import Excel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsInitialStockModalOpen(true)}
                  title="Import initial stock"
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
              </>
            )}
          </div>
        }
      />

      {/* Primary Search & Filters */}
      <StockFilterBar
        search={search}
        trackingType={trackingType}
        materialType={materialType}
        statusFilter={statusFilter}
        warehouseId={warehouseId}
        warehouses={warehouses}
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        onUpdateFilters={updateFilters}
        onResetAll={handleResetAll}
        activeFilters={activeFilters}
      />

      {/* Item Summary Bar */}
      <StockSummaryBar itemSummary={itemSummary} />

      {/* Stock Table */}
      <StockTable
        search={search}
        trackingType={trackingType}
        materialType={materialType}
        warehouseId={warehouseId}
        statusFilter={statusFilter}
        refreshKey={refreshKey}
        warehouses={warehouses}
        canManage={canManage}
        onEditItem={handleEditItem}
        onAdjustStock={handleAdjustStock}
      />

      {/* Modals */}
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

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importType="INITIAL_STOCK"
        title="Import Initial Stock from Excel"
        templateType="initial-stock"
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      <MonthlyReportModal
        isOpen={isMonthlyReportModalOpen}
        onClose={() => setIsMonthlyReportModalOpen(false)}
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

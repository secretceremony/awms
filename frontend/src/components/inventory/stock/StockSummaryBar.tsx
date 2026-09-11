import React from 'react';

export interface ItemSummaryData {
  id: number;
  name: string;
  materialType?: string | null;
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

export interface StockSummaryBarProps {
  itemSummary: ItemSummaryData | null;
}

export const StockSummaryBar: React.FC<StockSummaryBarProps> = ({ itemSummary }) => {
  if (!itemSummary) return null;

  return (
    <div className="stock-summary-bar">
      <div className="stock-summary-info">
        <div className="stock-summary-header">
          <span className="stock-summary-title">
            Item Summary
          </span>
          <span className="stock-summary-item-name">
            {itemSummary.name}
          </span>
          {itemSummary.brand && (
            <span className="stock-summary-brand">
              ({itemSummary.brand})
            </span>
          )}
        </div>
        <div className="stock-summary-meta">
          Tracking: <strong>{itemSummary.trackingType}</strong> &bull; Unit: {itemSummary.unit.name}
        </div>
      </div>

      <div className="stock-summary-metrics">
        <div className="stock-summary-stat">
          <div className="stock-summary-stat-label">Total Inventory</div>
          <div className="stock-summary-stat-value">
            {itemSummary.totalAll}
          </div>
        </div>

        <div className="stock-summary-divider" />

        <div className="stock-summary-stat">
          <div className="stock-summary-stat-label">In Warehouse</div>
          <div className="stock-summary-stat-value value-warehouse">
            {itemSummary.totalWarehouseQuantity}
          </div>
        </div>

        <div className="stock-summary-stat">
          <div className="stock-summary-stat-label">Deployed (Site)</div>
          <div className="stock-summary-stat-value value-deployed">
            {itemSummary.totalDeployedQuantity}
          </div>
        </div>

        {itemSummary.trackingType === 'SERIALIZED' && (
          <>
            <div className="stock-summary-stat">
              <div className="stock-summary-stat-label">Under Repair</div>
              <div className="stock-summary-stat-value value-danger">
                {itemSummary.totalUnderRepairQuantity}
              </div>
            </div>

            <div className="stock-summary-stat">
              <div className="stock-summary-stat-label">Standby Bad</div>
              <div className="stock-summary-stat-value value-danger">
                {itemSummary.totalStandbyBadQuantity}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

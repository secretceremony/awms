import React from 'react';
import {
  FormField,
  Input,
  Select,
  QuantityStepper,
  SearchableSelect,
} from '../../ui/index.js';

export interface ProjectOption {
  id: number;
  name: string;
  siteCode: string | null;
  status: string;
  client?: { name: string };
}

export interface WarehouseOption {
  id: number;
  name: string;
  cityCode?: string | null;
}

export interface ProjectInventoryItem {
  id: string;
  trackingType: 'BULK' | 'SERIALIZED';
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  availableQty: number;
  unit: string;
  unitSymbol: string;
  itemSerialId?: number;
  serialNumber?: string;
  condition?: string;
  state?: string;
}

export interface ReturnFormData {
  movementDate: string;
  projectId: string;
  warehouseId: string;
  referenceNumber: string;
  notes: string;
}

export interface ProjectReturnSectionProps {
  projects: ProjectOption[];
  warehouses: WarehouseOption[];
  returnForm: ReturnFormData;
  projectInventory: ProjectInventoryItem[];
  isLoadingInventory: boolean;
  snSearch: string;
  selectedBulkReturns: { [itemId: number]: number };
  selectedSerialReturns: {
    [sn: string]: { selected: boolean; conditionLabel: string; notes: string };
  };
  onFormChange: (field: keyof ReturnFormData, value: string) => void;
  onSnSearchChange: (search: string) => void;
  onBulkReturnQtyChange: (itemId: number, qty: number, maxQty: number) => void;
  onSerialSelectToggle: (sn: string) => void;
  onSelectAllSerials: () => void;
  onDeselectAllSerials: () => void;
  onSerialConditionChange: (sn: string, condition: string) => void;
  onSerialNotesChange: (sn: string, notes: string) => void;
}

export const ProjectReturnSection: React.FC<ProjectReturnSectionProps> = ({
  projects,
  warehouses,
  returnForm,
  projectInventory,
  isLoadingInventory,
  snSearch,
  selectedBulkReturns,
  selectedSerialReturns,
  onFormChange,
  onSnSearchChange,
  onBulkReturnQtyChange,
  onSerialSelectToggle,
  onSelectAllSerials,
  onDeselectAllSerials,
  onSerialConditionChange,
  onSerialNotesChange,
}) => {
  const bulkItems = projectInventory.filter((i) => i.trackingType === 'BULK');
  const serializedItems = projectInventory.filter((i) => i.trackingType === 'SERIALIZED');

  return (
    <div>
      <div className="form-grid" style={{ marginBottom: '1rem' }}>
        <FormField label="Source Project *" required style={{ marginBottom: 0 }}>
          <SearchableSelect
            required
            placeholder="Select Project returning assets..."
            searchPlaceholder="Type project name..."
            value={returnForm.projectId}
            onChange={(val) => onFormChange('projectId', val)}
            options={projects.map((p) => ({
              value: p.id,
              label: p.name,
              badge: p.siteCode || undefined,
              sublabel: p.client?.name ? `Client: ${p.client.name}` : undefined,
            }))}
          />
        </FormField>

        <FormField label="Destination Warehouse *" required style={{ marginBottom: 0 }}>
          <SearchableSelect
            required
            placeholder="Select Warehouse to receive returned items..."
            searchPlaceholder="Type warehouse name or city code..."
            value={returnForm.warehouseId}
            onChange={(val) => onFormChange('warehouseId', val)}
            options={warehouses.map((w) => ({
              value: w.id,
              label: w.name,
              badge: w.cityCode || undefined,
            }))}
          />
        </FormField>
      </div>

      <div className="form-grid" style={{ marginBottom: '1rem' }}>
        <FormField label="Movement Date *" required style={{ marginBottom: 0 }}>
          <Input
            type="date"
            required
            value={returnForm.movementDate}
            onChange={(e) => onFormChange('movementDate', e.target.value)}
          />
        </FormField>

        <FormField label="Reference Number" style={{ marginBottom: 0 }}>
          <Input
            placeholder="e.g. RET-PHM-001..."
            value={returnForm.referenceNumber}
            onChange={(e) => onFormChange('referenceNumber', e.target.value)}
          />
        </FormField>
      </div>

      <div className="form-grid" style={{ marginBottom: '1rem' }}>
        <FormField label="Notes / Purpose" style={{ marginBottom: 0 }}>
          <Input
            placeholder="e.g. Project completion return, equipment recheck..."
            value={returnForm.notes}
            onChange={(e) => onFormChange('notes', e.target.value)}
          />
        </FormField>
      </div>

      {/* Project Assets Picker */}
      {returnForm.projectId && (
        <div className="project-return-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Project Inventory to Return
            </h4>
            <Input
              placeholder="Search serial number or item..."
              value={snSearch}
              onChange={(e) => onSnSearchChange(e.target.value)}
              style={{ width: '220px', padding: '4px 8px', fontSize: '0.75rem' }}
            />
          </div>

          {isLoadingInventory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading project inventory...
            </div>
          ) : projectInventory.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '6px',
                border: '1px dashed var(--card-border)',
              }}
            >
              No inventory currently deployed at this project site.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Bulk Return Items */}
              {bulkItems.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                    }}
                  >
                    Bulk Materials
                  </div>
                  <div className="project-return-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: 'var(--accent-secondary-bg, #F8FAFC)',
                            borderBottom: '1px solid var(--card-border, #E2E8F0)',
                            textAlign: 'left',
                            color: 'var(--text-secondary, #64748B)',
                          }}
                        >
                          <th style={{ padding: '6px 10px' }}>Item</th>
                          <th style={{ padding: '6px 10px' }}>At Project</th>
                          <th style={{ padding: '6px 10px', width: '140px' }}>Return Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkItems.map((bItem) => {
                          const currentReturnQty = selectedBulkReturns[bItem.itemId] || 0;
                          return (
                            <tr key={bItem.itemId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '6px 10px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary, #1E293B)' }}>
                                  {bItem.itemName}
                                </div>
                                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary, #64748B)' }}>
                                  {[bItem.brand, bItem.modelNumber].filter(Boolean).join(' - ')}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: '6px 10px',
                                  fontWeight: 600,
                                  color: 'var(--text-primary, #1E293B)',
                                }}
                              >
                                {bItem.availableQty} {bItem.unitSymbol}
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <QuantityStepper
                                  min={0}
                                  max={bItem.availableQty}
                                  value={currentReturnQty}
                                  onChange={(val) =>
                                    onBulkReturnQtyChange(bItem.itemId, val, bItem.availableQty)
                                  }
                                  unitSymbol={bItem.unitSymbol}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Serialized Return Items */}
              {serializedItems.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary, #475569)',
                      }}
                    >
                      Serialized Assets
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={onSelectAllSerials}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--primary-color, #2250A1)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={onDeselectAllSerials}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-secondary, #64748B)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div
                    className="project-return-table-wrapper"
                    style={{
                      maxHeight: '240px',
                      overflowY: 'auto',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: 'var(--accent-secondary-bg, #F8FAFC)',
                            borderBottom: '1px solid var(--card-border, #E2E8F0)',
                            textAlign: 'left',
                            color: 'var(--text-secondary, #64748B)',
                          }}
                        >
                          <th style={{ padding: '6px 10px', width: '30px' }}></th>
                          <th style={{ padding: '6px 10px' }}>Serial Number</th>
                          <th style={{ padding: '6px 10px' }}>Item</th>
                          <th style={{ padding: '6px 10px', width: '150px' }}>Returned Condition</th>
                          <th style={{ padding: '6px 10px' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serializedItems
                          .filter((i) =>
                            snSearch
                              ? i.serialNumber?.toLowerCase().includes(snSearch.toLowerCase()) ||
                                i.itemName.toLowerCase().includes(snSearch.toLowerCase())
                              : true,
                          )
                          .map((sItem) => {
                            const sn = sItem.serialNumber!;
                            const isSelected = selectedSerialReturns[sn]?.selected || false;
                            const cond = selectedSerialReturns[sn]?.conditionLabel || 'Standby Good';
                            const notes = selectedSerialReturns[sn]?.notes || '';

                            return (
                              <tr
                                key={sn}
                                style={{
                                  borderBottom: '1px solid #F1F5F9',
                                  backgroundColor: isSelected ? 'var(--accent-primary-light, #EFF6FF)' : undefined,
                                }}
                              >
                                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onSerialSelectToggle(sn)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td
                                  style={{
                                    padding: '6px 10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: 'var(--text-primary, #1E293B)',
                                  }}
                                >
                                  {sn}
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  <div style={{ color: 'var(--text-primary, #1E293B)' }}>{sItem.itemName}</div>
                                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary, #64748B)' }}>
                                    {[sItem.brand, sItem.modelNumber].filter(Boolean).join(' - ')}
                                  </div>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  <Select
                                    value={cond}
                                    disabled={!isSelected}
                                    onChange={(e) => onSerialConditionChange(sn, e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                                  >
                                    <option value="Standby Good">Standby Good</option>
                                    <option value="Standby Bad">Standby Bad</option>
                                    <option value="Under Repair">Under Repair</option>
                                  </Select>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  <Input
                                    placeholder="Condition note"
                                    disabled={!isSelected}
                                    value={notes}
                                    onChange={(e) => onSerialNotesChange(sn, e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectReturnSection;

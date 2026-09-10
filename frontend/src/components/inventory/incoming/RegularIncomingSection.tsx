import React from 'react';
import {
  FormField,
  Input,
  Select,
  Button,
  QuantityStepper,
  SearchableSelect,
} from '../../ui/index.js';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import type { SerialItemEntry } from './BatchPasteSerialsModal.js';

export interface ItemOption {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unit?: { name: string; symbol: string | null };
}

export interface WarehouseOption {
  id: number;
  name: string;
  cityCode?: string | null;
}

export interface StagedIncomingItem {
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unitSymbol: string;
  quantity: number;
  serialRows?: SerialItemEntry[];
}

export interface RegularFormData {
  movementDate: string;
  warehouseId: string;
  referenceNumber: string;
  notes: string;
}

export interface RegularIncomingSectionProps {
  warehouses: WarehouseOption[];
  items: ItemOption[];
  regularForm: RegularFormData;
  stagedItems: StagedIncomingItem[];
  activeItemId: string;
  activeQuantity: number;
  activeSerialRows: SerialItemEntry[];
  onFormChange: (field: keyof RegularFormData, value: string) => void;
  onActiveItemIdChange: (itemId: string) => void;
  onActiveQuantityChange: (qty: number) => void;
  onActiveSerialRowsChange: (rows: SerialItemEntry[]) => void;
  onAddActiveItemToStaged: () => void;
  onRemoveStagedItem: (index: number) => void;
  onOpenPasteModal: () => void;
}

export const RegularIncomingSection: React.FC<RegularIncomingSectionProps> = ({
  warehouses,
  items,
  regularForm,
  stagedItems,
  activeItemId,
  activeQuantity,
  activeSerialRows,
  onFormChange,
  onActiveItemIdChange,
  onActiveQuantityChange,
  onActiveSerialRowsChange,
  onAddActiveItemToStaged,
  onRemoveStagedItem,
  onOpenPasteModal,
}) => {
  const selectedActiveItem = items.find((i) => String(i.id) === activeItemId);
  const isActiveItemSerialized = selectedActiveItem?.trackingType === 'SERIALIZED';

  const totalStagedBulk = stagedItems.reduce(
    (acc, i) => acc + (i.trackingType === 'BULK' ? i.quantity : 0),
    0,
  );
  const totalStagedSerials = stagedItems.reduce(
    (acc, i) => acc + (i.trackingType === 'SERIALIZED' ? i.quantity : 0),
    0,
  );

  const handleItemSelect = (val: string) => {
    onActiveItemIdChange(val);
    const it = items.find((i) => String(i.id) === val);
    if (it?.trackingType === 'SERIALIZED') {
      onActiveSerialRowsChange([{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }]);
    }
  };

  const handleSerialChange = (idx: number, field: keyof SerialItemEntry, value: string) => {
    const updated = [...activeSerialRows];
    updated[idx] = { ...updated[idx], [field]: value };
    onActiveSerialRowsChange(updated);
  };

  const handleAddSerialField = () => {
    onActiveSerialRowsChange([
      ...activeSerialRows,
      { serialNumber: '', conditionLabel: 'Standby Good', notes: '' },
    ]);
  };

  const handleRemoveSerialField = (idx: number) => {
    onActiveSerialRowsChange(activeSerialRows.filter((_, i) => i !== idx));
  };

  const handleSetAllConditions = (condition: string) => {
    onActiveSerialRowsChange(activeSerialRows.map((r) => ({ ...r, conditionLabel: condition })));
  };

  return (
    <div>
      {/* Header Information */}
      <div className="form-grid" style={{ marginBottom: '1rem' }}>
        <FormField label="Destination Warehouse *" required style={{ marginBottom: 0 }}>
          <SearchableSelect
            required
            placeholder="Search destination warehouse..."
            searchPlaceholder="Type warehouse name or city code..."
            value={regularForm.warehouseId}
            onChange={(val) => onFormChange('warehouseId', val)}
            options={warehouses.map((w) => ({
              value: w.id,
              label: w.name,
              badge: w.cityCode || undefined,
            }))}
          />
        </FormField>

        <FormField label="Movement Date *" required style={{ marginBottom: 0 }}>
          <Input
            type="date"
            required
            value={regularForm.movementDate}
            onChange={(e) => onFormChange('movementDate', e.target.value)}
          />
        </FormField>
      </div>

      {/* Staged Items List / Receipt Lines */}
      {stagedItems.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Receipt Items ({stagedItems.length} line(s) &bull;{' '}
              {totalStagedBulk > 0 ? `${totalStagedBulk} bulk` : ''}{' '}
              {totalStagedSerials > 0 ? `${totalStagedSerials} serials` : ''})
            </span>
          </div>

          <div style={{ border: '1px solid var(--card-border)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--accent-secondary-bg)', borderBottom: '1px solid var(--card-border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '6px 10px' }}>Item</th>
                  <th style={{ padding: '6px 10px' }}>Type</th>
                  <th style={{ padding: '6px 10px' }}>Quantity / Serials</th>
                  <th style={{ padding: '6px 10px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {stagedItems.map((si, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{si.itemName}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                        {[si.brand, si.modelNumber].filter(Boolean).join(' - ') || 'Generic'}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          backgroundColor: si.trackingType === 'SERIALIZED' ? '#F3E8FF' : '#E0F2FE',
                          color: si.trackingType === 'SERIALIZED' ? '#7E22CE' : '#0369A1',
                        }}
                      >
                        {si.trackingType}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: 700, color: '#0F766E' }}>
                        {si.quantity} {si.unitSymbol}
                      </div>
                      {si.trackingType === 'SERIALIZED' && si.serialRows && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                          {si.serialRows.map((sr, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontFamily: 'monospace',
                                backgroundColor: 'var(--accent-secondary-bg)',
                                border: '1px solid var(--card-border)',
                              }}
                            >
                              {sr.serialNumber}{' '}
                              <span style={{ color: sr.conditionLabel === 'Standby Good' ? '#059669' : '#DC2626' }}>
                                ({sr.conditionLabel})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onRemoveStagedItem(idx)}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                        title="Remove item line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Form Box */}
      <div style={{ backgroundColor: 'var(--accent-secondary-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--border-radius)', padding: '12px 14px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stagedItems.length > 0 ? '+ Add Another Item to Receipt' : 'Add Item to Receipt'}
          </span>
        </div>

        <div className="form-grid" style={{ marginBottom: '8px' }}>
          <FormField label="Item Master *" style={{ marginBottom: 0 }}>
            <SearchableSelect
              placeholder="Search item to receive..."
              searchPlaceholder="Type name, brand, or model..."
              value={activeItemId}
              onChange={handleItemSelect}
              options={items.map((i) => ({
                value: i.id,
                label: i.name,
                badge: i.trackingType,
                sublabel: i.brand
                  ? i.modelNumber
                    ? `${i.brand} [MN: ${i.modelNumber}]`
                    : i.brand
                  : i.modelNumber
                  ? `MN: ${i.modelNumber}`
                  : undefined,
              }))}
            />
          </FormField>

          {!isActiveItemSerialized ? (
            <FormField label="Quantity *" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                <QuantityStepper
                  min={1}
                  value={activeQuantity}
                  onChange={(val) => onActiveQuantityChange(val || 1)}
                  unitSymbol={selectedActiveItem?.unit?.symbol || 'pcs'}
                />
              </div>
            </FormField>
          ) : (
            <FormField label="Serial Units Count" style={{ marginBottom: 0 }}>
              <div style={{ paddingTop: '8px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                {activeSerialRows.length} Serial Unit(s)
              </div>
            </FormField>
          )}
        </div>

        {/* Serial Entry Rows if active item is SERIALIZED */}
        {isActiveItemSerialized && (
          <div style={{ border: '1px solid var(--card-border)', borderRadius: 'var(--border-radius-sm)', padding: '10px', backgroundColor: '#FFFFFF', marginTop: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Serial Numbers &amp; Condition Configuration
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Set all:</span>
                <button
                  type="button"
                  onClick={() => handleSetAllConditions('Standby Good')}
                  style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '3px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5', color: '#059669', cursor: 'pointer' }}
                >
                  Good
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllConditions('Standby Bad')}
                  style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '3px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                >
                  Bad
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllConditions('Under Repair')}
                  style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '3px', border: '1px solid #FDE68A', backgroundColor: '#FFFBEB', color: '#D97706', cursor: 'pointer' }}
                >
                  Repair
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onOpenPasteModal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  <ClipboardList size={13} /> Batch Paste
                </Button>
              </div>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeSerialRows.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Input
                      placeholder={`Serial #${idx + 1}`}
                      value={row.serialNumber}
                      onChange={(e) => handleSerialChange(idx, 'serialNumber', e.target.value)}
                      style={{ flex: 2, padding: '4px 8px', fontSize: '0.8rem' }}
                    />
                    <Select
                      value={row.conditionLabel}
                      onChange={(e) => handleSerialChange(idx, 'conditionLabel', e.target.value)}
                      style={{ flex: 1.5, padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      <option value="Standby Good">Standby Good</option>
                      <option value="Standby Bad">Standby Bad</option>
                      <option value="Under Repair">Under Repair</option>
                    </Select>
                    <Input
                      placeholder="Notes (optional)"
                      value={row.notes}
                      onChange={(e) => handleSerialChange(idx, 'notes', e.target.value)}
                      style={{ flex: 2, padding: '4px 8px', fontSize: '0.8rem' }}
                    />
                    {activeSerialRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSerialField(idx)}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddSerialField}
              style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 6px' }}
            >
              <Plus size={13} /> Add Row
            </Button>
          </div>
        )}

        {activeItemId && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAddActiveItemToStaged}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
            >
              <Plus size={14} /> Add Line to Receipt
            </Button>
          </div>
        )}
      </div>

      <div className="form-grid">
        <FormField label="Reference (PO / Contract / Waybill)">
          <Input
            placeholder="e.g. PO-2026-001, WB-9988..."
            value={regularForm.referenceNumber}
            onChange={(e) => onFormChange('referenceNumber', e.target.value)}
          />
        </FormField>

        <FormField label="Notes / Purpose">
          <Input
            placeholder="e.g. Stock replenishment, new procurement..."
            value={regularForm.notes}
            onChange={(e) => onFormChange('notes', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  );
};

export default RegularIncomingSection;

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  NumberInput,
  ConfirmModal,
  SearchableSelect,
} from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { CheckSquare, Square } from 'lucide-react';

interface ItemOption {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unit?: { name: string; symbol: string | null };
}

interface WarehouseOption {
  id: number;
  name: string;
  cityCode?: string | null;
}

interface SerialOption {
  id: number;
  serialNumber: string;
  state: string;
  conditionLabel: string | null;
  currentWarehouseId: number | null;
  notes: string | null;
}

export interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWarehouseId?: number | null;
  initialItemId?: number | null;
  lockContext?: boolean;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialWarehouseId = null,
  initialItemId = null,
  lockContext = false,
}) => {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [serials, setSerials] = useState<SerialOption[]>([]);
  const [currentBulkStock, setCurrentBulkStock] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    itemId: '',
    adjustmentSign: '1', // '1' = Increase, '-1' = Decrease
    adjustmentMagnitude: 1,
    reason: '',
  });

  // Multi-serial adjustment state
  const [selectedSerials, setSelectedSerials] = useState<{
    [sn: string]: { selected: boolean; newCondition: string; notes: string };
  }>({});
  const [snSearch, setSnSearch] = useState('');

  const [initialStateSnapshot, setInitialStateSnapshot] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const [isLoadingSerials, setIsLoadingSerials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [itemsRes, whRes]: any = await Promise.all([
          apiClient.get('/items', { params: { limit: 100 } }),
          apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } }),
        ]);
        setItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.data || []);
        setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
      } catch (err) {
        console.error('Failed to load adjustment dependencies:', err);
      }
    };

    if (isOpen) {
      fetchDependencies();
      const init = {
        movementDate: new Date().toISOString().split('T')[0],
        warehouseId: initialWarehouseId ? String(initialWarehouseId) : '',
        itemId: initialItemId ? String(initialItemId) : '',
        adjustmentSign: '1',
        adjustmentMagnitude: 1,
        reason: '',
      };
      setFormData(init);
      setSelectedSerials({});
      setSnSearch('');
      setErrorMsg(null);
      setInitialStateSnapshot(JSON.stringify(init));

      setTimeout(() => {
        reasonInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialWarehouseId, initialItemId]);

  const selectedItem = items.find((i) => String(i.id) === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

  // Load bulk balance or serial options when warehouse & item change
  useEffect(() => {
    if (!formData.warehouseId || !formData.itemId) {
      setCurrentBulkStock(null);
      setSerials([]);
      setSelectedSerials({});
      return;
    }

    const loadStockContext = async () => {
      if (isSerialized) {
        setIsLoadingSerials(true);
        try {
          const res = await apiClient.get<SerialOption[]>(`/items/${formData.itemId}/serials`);
          const list = Array.isArray(res) ? res : [];
          // Filter serials located in the selected warehouse
          const filtered = list.filter(
            (s) => String(s.currentWarehouseId) === String(formData.warehouseId),
          );
          setSerials(filtered);

          const snMap: any = {};
          filtered.forEach((s) => {
            snMap[s.serialNumber] = {
              selected: false,
              newCondition: s.conditionLabel || 'Standby Good',
              notes: '',
            };
          });
          setSelectedSerials(snMap);
        } catch (err) {
          console.error('Failed to load serials for adjustment:', err);
          setSerials([]);
        } finally {
          setIsLoadingSerials(false);
        }
      } else {
        try {
          const res: any = await apiClient.get(`/items/${formData.itemId}`);
          const whStocks = res?.warehouseStocks || [];
          const matched = whStocks.find(
            (ws: any) => String(ws.warehouseId) === String(formData.warehouseId),
          );
          setCurrentBulkStock(matched ? matched.quantity : 0);
        } catch (err) {
          console.error('Failed to load bulk stock balance:', err);
          setCurrentBulkStock(0);
        }
      }
    };

    loadStockContext();
  }, [formData.warehouseId, formData.itemId, isSerialized]);

  const currentSnapshot = JSON.stringify({ formData, selectedSerials });
  const isDirty = currentSnapshot !== initialStateSnapshot && initialStateSnapshot !== '';

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleToggleSelectSerial = (sn: string) => {
    setSelectedSerials((prev) => ({
      ...prev,
      [sn]: {
        ...prev[sn],
        selected: !prev[sn]?.selected,
      },
    }));
  };

  const handleSelectAllSerials = () => {
    const updated: any = { ...selectedSerials };
    filteredSerials.forEach((s) => {
      if (updated[s.serialNumber]) {
        updated[s.serialNumber] = { ...updated[s.serialNumber], selected: true };
      }
    });
    setSelectedSerials(updated);
  };

  const handleDeselectAllSerials = () => {
    const updated: any = { ...selectedSerials };
    Object.keys(updated).forEach((sn) => {
      updated[sn] = { ...updated[sn], selected: false };
    });
    setSelectedSerials(updated);
  };

  const handleSerialConditionChange = (sn: string, cond: string) => {
    setSelectedSerials((prev) => ({
      ...prev,
      [sn]: {
        ...prev[sn],
        newCondition: cond,
      },
    }));
  };

  const handleSerialNotesChange = (sn: string, notes: string) => {
    setSelectedSerials((prev) => ({
      ...prev,
      [sn]: {
        ...prev[sn],
        notes,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.warehouseId) {
      setErrorMsg('Please select a warehouse');
      return;
    }
    if (!formData.itemId) {
      setErrorMsg('Please select an item');
      return;
    }
    if (!formData.reason.trim()) {
      setErrorMsg('Adjustment reason is mandatory');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (isSerialized) {
        // Multi-serial adjustment submission
        const chosen = Object.entries(selectedSerials).filter(([_, data]) => data.selected);
        if (chosen.length === 0) {
          throw new Error('Please select at least one serial number to adjust');
        }

        const serialsPayload = chosen.map(([sn, data]) => ({
          serialNumber: sn,
          newCondition: data.newCondition,
          notes: data.notes.trim() || undefined,
        }));

        await apiClient.post('/stock-movements/adjustments', {
          movementDate: formData.movementDate,
          warehouseId: Number(formData.warehouseId),
          itemId: Number(formData.itemId),
          reason: formData.reason.trim(),
          serials: serialsPayload,
        });
      } else {
        const delta = Number(formData.adjustmentSign) * Number(formData.adjustmentMagnitude);
        if (delta === 0) {
          throw new Error('Adjustment quantity cannot be 0');
        }

        await apiClient.post('/stock-movements/adjustments', {
          movementDate: formData.movementDate,
          warehouseId: Number(formData.warehouseId),
          itemId: Number(formData.itemId),
          reason: formData.reason.trim(),
          adjustmentQty: delta,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record adjustment');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSerials = serials.filter(
    (s) => !snSearch.trim() || s.serialNumber.toLowerCase().includes(snSearch.toLowerCase()),
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title="Stock Balance &amp; Condition Adjustment"
        maxWidth="680px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Warehouse Hub *" required style={{ marginBottom: 0 }}>
                <SearchableSelect
                  disabled={lockContext && Boolean(initialWarehouseId)}
                  required
                  placeholder="Search warehouse hub..."
                  searchPlaceholder="Type warehouse name or city code..."
                  value={formData.warehouseId}
                  onChange={(val) => setFormData({ ...formData, warehouseId: val })}
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                    badge: w.cityCode || undefined,
                  }))}
                />
              </FormField>

              <FormField label="Adjustment Date *" required style={{ marginBottom: 0 }}>
                <Input
                  type="date"
                  required
                  value={formData.movementDate}
                  onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Item Master *" required>
              <SearchableSelect
                disabled={lockContext && Boolean(initialItemId)}
                required
                placeholder="Search item master..."
                searchPlaceholder="Type item name, brand, or model number..."
                value={formData.itemId}
                onChange={(val) => setFormData({ ...formData, itemId: val })}
                options={items.map((i) => ({
                  value: i.id,
                  label: i.name,
                  badge: i.trackingType,
                  sublabel: i.brand ? (i.modelNumber ? `${i.brand} [MN: ${i.modelNumber}]` : i.brand) : (i.modelNumber ? `MN: ${i.modelNumber}` : undefined),
                }))}
              />
            </FormField>

            {/* Context status card */}
            {selectedItem && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Tracking: </span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedItem.trackingType}</span>
                    {selectedItem.unit && (
                      <span style={{ color: '#64748B', marginLeft: '8px' }}>
                        Unit: {selectedItem.unit.name} ({selectedItem.unit.symbol || '—'})
                      </span>
                    )}
                  </div>
                  {!isSerialized && currentBulkStock !== null && (
                    <div>
                      <span style={{ color: '#64748B' }}>Current Stock: </span>
                      <span style={{ fontWeight: 700, color: '#2250A1' }}>
                        {currentBulkStock} {selectedItem.unit?.symbol || 'pcs'}
                      </span>
                    </div>
                  )}
                  {isSerialized && (
                    <div>
                      <span style={{ color: '#64748B' }}>In Hub: </span>
                      <span style={{ fontWeight: 700, color: '#7C3AED' }}>{serials.length} Serial(s)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BULK ADJUSTMENT CONTROLS */}
            {!isSerialized && selectedItem && (
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  marginBottom: '1rem',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                  Bulk Quantity Correction
                </h4>

                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <FormField label="Action / Direction" required style={{ marginBottom: 0 }}>
                    <Select
                      value={formData.adjustmentSign}
                      onChange={(e) => setFormData({ ...formData, adjustmentSign: e.target.value })}
                    >
                      <option value="1">+ Increase Stock (Found / Surplus)</option>
                      <option value="-1">- Decrease Stock (Damaged / Lost / Expired)</option>
                    </Select>
                  </FormField>

                  <FormField label="Quantity Change" required style={{ marginBottom: 0 }}>
                    <NumberInput
                      min={1}
                      required
                      value={formData.adjustmentMagnitude}
                      onChange={(val) => setFormData({ ...formData, adjustmentMagnitude: val || 1 })}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* SERIALIZED MULTI-SN ADJUSTMENT CONTROLS */}
            {isSerialized && (
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B' }}>
                    Select Serials to Update ({serials.length} located in hub)
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Input
                      placeholder="Filter SN..."
                      value={snSearch}
                      onChange={(e) => setSnSearch(e.target.value)}
                      style={{ width: '130px', padding: '2px 6px', fontSize: '0.75rem' }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSelectAllSerials}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CheckSquare size={12} /> Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllSerials}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Square size={12} /> Deselect All
                    </Button>
                  </div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {isLoadingSerials ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                      Loading serials in warehouse...
                    </div>
                  ) : filteredSerials.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                      No matching serials currently in this warehouse hub.
                    </div>
                  ) : (
                    <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, backgroundColor: '#F1F5F9', zIndex: 1 }}>
                          <th style={{ width: '35px' }}></th>
                          <th>Serial Number</th>
                          <th style={{ width: '130px' }}>Current State</th>
                          <th style={{ width: '160px' }}>New Condition *</th>
                          <th style={{ width: '160px' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSerials.map((s) => {
                          const stateEntry = selectedSerials[s.serialNumber] || {
                            selected: false,
                            newCondition: s.conditionLabel || 'Standby Good',
                            notes: '',
                          };

                          return (
                            <tr
                              key={s.id}
                              style={{
                                backgroundColor: stateEntry.selected ? '#F5F3FF' : undefined,
                              }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={stateEntry.selected}
                                  onChange={() => handleToggleSelectSerial(s.serialNumber)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7C3AED' }}>
                                  {s.serialNumber}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                                  {s.conditionLabel || s.state}
                                </span>
                              </td>
                              <td>
                                <Select
                                  disabled={!stateEntry.selected}
                                  value={stateEntry.newCondition}
                                  onChange={(e) =>
                                    handleSerialConditionChange(s.serialNumber, e.target.value)
                                  }
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                  <option value="Standby Good">Standby Good</option>
                                  <option value="Standby Bad">Standby Bad</option>
                                  <option value="Under Repair">Under Repair</option>
                                </Select>
                              </td>
                              <td>
                                <Input
                                  disabled={!stateEntry.selected}
                                  placeholder="SN note..."
                                  value={stateEntry.notes}
                                  onChange={(e) =>
                                    handleSerialNotesChange(s.serialNumber, e.target.value)
                                  }
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <FormField label="Adjustment Reason / Justification" required style={{ marginBottom: 0 }}>
              <Textarea
                ref={reasonInputRef}
                placeholder="e.g. Physical stock count variance, damaged during storm, inspection batch failure..."
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </FormField>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Submit Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this form. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        variant="danger"
      />
    </>
  );
};

export default AdjustmentModal;

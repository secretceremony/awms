import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

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
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [serials, setSerials] = useState<SerialOption[]>([]);
  const [currentBulkStock, setCurrentBulkStock] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    itemId: '',
    adjustmentQty: 1,
    selectedSerialNumber: '',
    newCondition: 'Standby Good',
    serialNotes: '',
    reason: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setFormData({
        movementDate: new Date().toISOString().split('T')[0],
        warehouseId: '',
        itemId: '',
        adjustmentQty: 1,
        selectedSerialNumber: '',
        newCondition: 'Standby Good',
        serialNotes: '',
        reason: '',
      });
      setErrorMsg(null);
      setSerials([]);
      setCurrentBulkStock(null);
    }
  }, [isOpen]);

  const selectedItem = items.find((i) => String(i.id) === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

  // Fetch Serials or Bulk Stock when Item and Warehouse change
  useEffect(() => {
    const fetchItemStockData = async () => {
      if (!formData.itemId || !formData.warehouseId) {
        setSerials([]);
        setCurrentBulkStock(null);
        return;
      }

      try {
        if (isSerialized) {
          const res: any = await apiClient.get(`/items/${formData.itemId}/serials`);
          const allSerials: SerialOption[] = Array.isArray(res) ? res : res?.data || [];
          const whSerials = allSerials.filter(
            (s) => Number(s.currentWarehouseId) === Number(formData.warehouseId),
          );
          setSerials(whSerials);
          if (whSerials.length > 0) {
            setFormData((prev) => ({
              ...prev,
              selectedSerialNumber: whSerials[0].serialNumber,
              newCondition: whSerials[0].conditionLabel || whSerials[0].state || 'Standby Good',
              serialNotes: whSerials[0].notes || '',
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              selectedSerialNumber: '',
            }));
          }
        } else {
          // Bulk stock lookup
          const stockRes: any = await apiClient.get('/stocks', {
            params: { warehouseId: formData.warehouseId, search: selectedItem?.name },
          });
          const rows = stockRes?.data || [];
          const matching = rows.find(
            (r: any) => Number(r.itemId) === Number(formData.itemId),
          );
          setCurrentBulkStock(matching?.quantity || 0);
        }
      } catch (err) {
        console.error('Failed to fetch item stock details:', err);
      }
    };

    fetchItemStockData();
  }, [formData.itemId, formData.warehouseId, isSerialized, selectedItem]);

  const selectedSerialObj = serials.find((s) => s.serialNumber === formData.selectedSerialNumber);

  const resultingStock =
    currentBulkStock !== null ? currentBulkStock + formData.adjustmentQty : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.warehouseId) {
      setErrorMsg('Please select a warehouse');
      return;
    }
    if (!formData.itemId) {
      setErrorMsg('Please select an item');
      return;
    }
    if (!formData.reason.trim()) {
      setErrorMsg('Adjustment reason is required');
      return;
    }

    if (!isSerialized) {
      if (formData.adjustmentQty === 0) {
        setErrorMsg('Adjustment quantity cannot be 0');
        return;
      }
      if (resultingStock !== null && resultingStock < 0) {
        setErrorMsg(`Adjustment would result in negative stock (${resultingStock}). Current stock is ${currentBulkStock}.`);
        return;
      }
    } else {
      if (!formData.selectedSerialNumber) {
        setErrorMsg('Please select a serial number to adjust');
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        movementDate: formData.movementDate,
        warehouseId: parseInt(formData.warehouseId, 10),
        itemId: parseInt(formData.itemId, 10),
        reason: formData.reason.trim(),
        adjustmentQty: !isSerialized ? formData.adjustmentQty : undefined,
        serialDetail: isSerialized
          ? {
              serialNumber: formData.selectedSerialNumber,
              newCondition: formData.newCondition,
              notes: formData.serialNotes.trim() || undefined,
            }
          : undefined,
      };

      await apiClient.post('/stock-movements/adjustment', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record stock adjustment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Stock Adjustment"
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Adjustment Date" required style={{ marginBottom: 0 }}>
              <Input
                type="date"
                required
                value={formData.movementDate}
                onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
              />
            </FormField>

            <FormField label="Warehouse Location" required style={{ marginBottom: 0 }}>
              <Select
                required
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.cityCode ? `(${w.cityCode})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Item to Adjust" required>
            <Select
              required
              value={formData.itemId}
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
            >
              <option value="">-- Select Item --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.brand ? `[${i.brand}]` : ''} {i.modelNumber ? `(${i.modelNumber})` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Read-only Item Metadata Banner */}
          {selectedItem && (
            <div
              style={{
                backgroundColor: 'var(--accent-secondary-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Brand</span>
                <strong>{selectedItem.brand || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Model Number</span>
                <strong>{selectedItem.modelNumber || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Unit</span>
                <strong>{selectedItem.unit?.symbol || selectedItem.unit?.name || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Tracking</span>
                <strong>{selectedItem.trackingType}</strong>
              </div>
            </div>
          )}

          {/* BULK Adjustment Form */}
          {!isSerialized && selectedItem && (
            <div
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                <span>
                  Current Stock: <strong>{currentBulkStock ?? 0} {selectedItem.unit?.symbol || ''}</strong>
                </span>
                <span style={{ color: resultingStock !== null && resultingStock < 0 ? 'var(--accent-red)' : 'var(--accent-blue)', fontWeight: 600 }}>
                  New Stock: {resultingStock ?? 0} {selectedItem.unit?.symbol || ''}
                </span>
              </div>

              <FormField label="Adjustment Quantity (e.g. +5 or -3)" required style={{ marginBottom: 0 }}>
                <Input
                  type="number"
                  required
                  step={1}
                  value={formData.adjustmentQty}
                  onChange={(e) =>
                    setFormData({ ...formData, adjustmentQty: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </FormField>
            </div>
          )}

          {/* SERIALIZED Adjustment Form */}
          {isSerialized && selectedItem && (
            <div
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              {serials.length === 0 ? (
                <p style={{ color: '#EF4444', fontSize: '13px', margin: 0 }}>
                  No active serial numbers found in the selected warehouse for this item.
                </p>
              ) : (
                <>
                  <FormField label="Select Serial Number" required>
                    <Select
                      required
                      value={formData.selectedSerialNumber}
                      onChange={(e) => {
                        const sn = e.target.value;
                        const match = serials.find((s) => s.serialNumber === sn);
                        setFormData({
                          ...formData,
                          selectedSerialNumber: sn,
                          newCondition: match?.conditionLabel || match?.state || 'Standby Good',
                          serialNotes: match?.notes || '',
                        });
                      }}
                    >
                      {serials.map((s) => (
                        <option key={s.id} value={s.serialNumber}>
                          {s.serialNumber} — [{s.conditionLabel || s.state}]
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  {selectedSerialObj && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                      Current State: <strong>{selectedSerialObj.state}</strong> | Condition:{' '}
                      <strong>{selectedSerialObj.conditionLabel || '-'}</strong>
                    </div>
                  )}

                  <div className="form-grid" style={{ marginBottom: 0 }}>
                    <FormField label="Updated Condition" required style={{ marginBottom: 0 }}>
                      <Select
                        value={formData.newCondition}
                        onChange={(e) => setFormData({ ...formData, newCondition: e.target.value })}
                      >
                        <option value="Standby Good">Standby Good</option>
                        <option value="Standby Bad">Standby Bad</option>
                        <option value="Under Repair">Under Repair</option>
                      </Select>
                    </FormField>

                    <FormField label="Serial Remarks / Notes" style={{ marginBottom: 0 }}>
                      <Input
                        type="text"
                        placeholder="Condition notes"
                        value={formData.serialNotes}
                        onChange={(e) => setFormData({ ...formData, serialNotes: e.target.value })}
                      />
                    </FormField>
                  </div>
                </>
              )}
            </div>
          )}

          <FormField label="Adjustment Reason" required>
            <Textarea
              required
              rows={3}
              placeholder="Detailed reason for this manual stock/condition correction (mandatory)"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </FormField>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};

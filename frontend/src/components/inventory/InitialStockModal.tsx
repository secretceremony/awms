import React, { useState, useEffect, useRef } from 'react';
import { Modal, FormField, Input, NumberInput, Select, Textarea, Button, ConfirmModal } from '../ui/index.js';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
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

interface SerialItemEntry {
  serialNumber: string;
  conditionLabel: string;
  notes: string;
}

export interface InitialStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InitialStockModal: React.FC<InitialStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [formData, setFormData] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    itemId: '',
    quantity: 1,
    serialRows: [] as SerialItemEntry[],
    notes: '',
  });

  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const itemSelectRef = useRef<HTMLSelectElement>(null);
  const whSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, whRes]: any = await Promise.all([
          apiClient.get('/items', { params: { limit: 100 } }),
          apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } }),
        ]);
        setItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.data || []);
        setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
      } catch (err) {
        console.error('Failed to load initial stock dependencies:', err);
      }
    };

    if (isOpen) {
      fetchData();
      const init = {
        movementDate: new Date().toISOString().split('T')[0],
        warehouseId: '',
        itemId: '',
        quantity: 1,
        serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
        notes: '',
      };
      setFormData(init);
      setInitialData(init);
      setErrorMsg(null);
      setPasteModalOpen(false);
      setPasteText('');
      setPasteError(null);

      setTimeout(() => {
        whSelectRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedItem = items.find((i) => String(i.id) === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleAddSerialField = () => {
    setFormData((prev) => ({
      ...prev,
      serialRows: [...prev.serialRows, { serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
    }));
  };

  const handleRemoveSerialField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      serialRows: prev.serialRows.filter((_, i) => i !== index),
    }));
  };

  const handleSerialChange = (index: number, field: keyof SerialItemEntry, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.serialRows];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, serialRows: updated };
    });
  };

  const handleProcessPaste = () => {
    setPasteError(null);
    if (!pasteText.trim()) {
      setPasteError('Please enter some serial numbers');
      return;
    }

    const lines = pasteText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setPasteError('No valid serial numbers found');
      return;
    }

    const seen = new Set<string>();
    const duplicates: string[] = [];
    const newRows: SerialItemEntry[] = [];

    lines.forEach((line) => {
      if (seen.has(line)) {
        duplicates.push(line);
      } else {
        seen.add(line);
        newRows.push({
          serialNumber: line,
          conditionLabel: 'Standby Good',
          notes: '',
        });
      }
    });

    if (duplicates.length > 0) {
      setPasteError(`Duplicate serial numbers found in paste: ${duplicates.join(', ')}`);
      return;
    }

    // Rule 12: Remove/ignore blank placeholder row automatically on paste
    setFormData((prev) => ({
      ...prev,
      serialRows: newRows,
    }));
    setPasteModalOpen(false);
    setPasteText('');
  };

  const handleSaveInternal = async (addAnother: boolean) => {
    if (!formData.warehouseId) {
      setErrorMsg('Please select a warehouse');
      return;
    }
    if (!formData.itemId) {
      setErrorMsg('Please select an item');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      let itemsPayload: any[] = [];
      if (isSerialized) {
        const serials = formData.serialRows
          .map((r) => ({
            serialNumber: r.serialNumber.trim(),
            conditionLabel: r.conditionLabel,
            notes: r.notes.trim() || undefined,
          }))
          .filter((s) => Boolean(s.serialNumber));

        if (serials.length === 0) {
          throw new Error('Please add at least one valid serial number');
        }

        const snSet = new Set<string>();
        for (const s of serials) {
          if (snSet.has(s.serialNumber)) {
            throw new Error(`Duplicate serial number: ${s.serialNumber}`);
          }
          snSet.add(s.serialNumber);
        }

        itemsPayload = [
          {
            itemId: Number(formData.itemId),
            quantity: serials.length,
            serialDetails: serials,
          },
        ];
      } else {
        if (formData.quantity <= 0) {
          throw new Error('Quantity must be greater than 0');
        }
        itemsPayload = [
          {
            itemId: Number(formData.itemId),
            quantity: Number(formData.quantity),
          },
        ];
      }

      await apiClient.post('/stock-movements/incoming', {
        movementType: 'INITIAL',
        movementDate: formData.movementDate,
        destinationWarehouseId: Number(formData.warehouseId),
        referenceNumber: 'INITIAL-STOCK',
        notes: formData.notes.trim() || undefined,
        items: itemsPayload,
      });

      onSuccess();

      if (addAnother) {
        // Rule 11: KEEP Warehouse and Movement Date, RESET Item, Qty, SNs, Notes
        const nextState = {
          movementDate: formData.movementDate,
          warehouseId: formData.warehouseId,
          itemId: '',
          quantity: 1,
          serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
          notes: '',
        };
        setFormData(nextState);
        setInitialData(nextState);
        setTimeout(() => {
          itemSelectRef.current?.focus();
        }, 50);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record initial stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title="Set Initial / Baseline Stock"
        maxWidth="640px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveInternal(false);
          }}
        >
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Field Order 1: Warehouse * & Movement Date */}
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Destination Warehouse" required style={{ marginBottom: 0 }}>
                <Select
                  ref={whSelectRef}
                  required
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.cityCode ? `[${w.cityCode}]` : ''}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Movement Date" required style={{ marginBottom: 0 }}>
                <Input
                  type="date"
                  required
                  value={formData.movementDate}
                  onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
                />
              </FormField>
            </div>

            {/* Field Order 2: Item * & Quantity */}
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Item Master" required style={{ marginBottom: 0 }}>
                <Select
                  ref={itemSelectRef}
                  required
                  value={formData.itemId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const it = items.find((i) => String(i.id) === newId);
                    setFormData({
                      ...formData,
                      itemId: newId,
                      serialRows:
                        it?.trackingType === 'SERIALIZED'
                          ? [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }]
                          : [],
                    });
                  }}
                >
                  <option value="">Select Item...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} {i.brand ? `(${i.brand})` : ''} — {i.trackingType}
                    </option>
                  ))}
                </Select>
              </FormField>

              {!isSerialized ? (
                <FormField label="Quantity" required style={{ marginBottom: 0 }}>
                  <NumberInput
                    min={1}
                    required
                    value={formData.quantity}
                    onChange={(val) => setFormData({ ...formData, quantity: val || 1 })}
                  />
                </FormField>
              ) : (
                <FormField label="Serial Count" style={{ marginBottom: 0 }}>
                  <div style={{ paddingTop: '8px', fontWeight: 600, color: '#2250A1' }}>
                    {formData.serialRows.length} Serial Unit(s)
                  </div>
                </FormField>
              )}
            </div>

            {/* Field Order 3: Serialized SN grid if applicable */}
            {isSerialized && (
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '1rem',
                  backgroundColor: '#F8FAFC',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                    Serial Numbers ({formData.serialRows.length})
                  </h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPasteModalOpen(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ClipboardList size={14} /> Multi-SN Paste
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {formData.serialRows.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Input
                        placeholder={`Serial #${idx + 1}`}
                        required
                        value={row.serialNumber}
                        onChange={(e) => handleSerialChange(idx, 'serialNumber', e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <Select
                        value={row.conditionLabel}
                        onChange={(e) => handleSerialChange(idx, 'conditionLabel', e.target.value)}
                        style={{ flex: 1.5 }}
                      >
                        <option value="Standby Good">Standby Good</option>
                        <option value="Standby Bad">Standby Bad</option>
                        <option value="Under Repair">Under Repair</option>
                      </Select>
                      <Input
                        placeholder="Notes (optional)"
                        value={row.notes}
                        onChange={(e) => handleSerialChange(idx, 'notes', e.target.value)}
                        style={{ flex: 2 }}
                      />
                      {formData.serialRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSerialField(idx)}
                          style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddSerialField}
                  style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Add Row
                </Button>
              </div>
            )}

            {/* Field Order 4: Notes */}
            <FormField label="Initial Balance Notes" style={{ marginBottom: 0 }}>
              <Textarea
                placeholder="e.g. Migration opening count, physical warehouse audit..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </FormField>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => handleSaveInternal(true)}
                isLoading={isSaving}
              >
                Save &amp; Add Another
              </Button>
              <Button variant="primary" type="submit" isLoading={isSaving}>
                Save Stock
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Multi-SN Batch Paste Modal */}
      <Modal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        title="Multi-SN Batch Paste"
        maxWidth="500px"
      >
        <div className="modal-body">
          {pasteError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{pasteError}</div>}
          <FormField label="Paste Serial Numbers (One per line)" required>
            <Textarea
              rows={8}
              placeholder={`SN-001\nSN-002\nSN-003`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={() => setPasteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={handleProcessPaste}>
            Import Serials
          </Button>
        </div>
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

export default InitialStockModal;

import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, NumberInput, Select, Textarea, Button } from '../ui/index.js';
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

export interface AddIncomingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddIncomingModal: React.FC<AddIncomingModalProps> = ({
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
    serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }] as SerialItemEntry[],
    referenceNumber: '',
    notes: '',
  });

  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        console.error('Failed to load incoming dependencies:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setFormData({
        movementDate: new Date().toISOString().split('T')[0],
        warehouseId: '',
        itemId: '',
        quantity: 1,
        serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
        referenceNumber: '',
        notes: '',
      });
      setErrorMsg(null);
      setPasteModalOpen(false);
      setPasteText('');
      setPasteError(null);
    }
  }, [isOpen]);

  const selectedItem = items.find((i) => String(i.id) === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

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

  const handleSerialRowChange = (index: number, field: keyof SerialItemEntry, value: string) => {
    setFormData((prev) => {
      const next = [...prev.serialRows];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, serialRows: next };
    });
  };

  const handleApplyPastedSerials = () => {
    setPasteError(null);
    const lines = pasteText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setPasteError('No serial numbers found. Paste at least one serial number.');
      return;
    }

    const seen = new Set<string>();
    const newRows: SerialItemEntry[] = [];

    for (const sn of lines) {
      const lower = sn.toLowerCase();
      if (seen.has(lower)) {
        setPasteError(`Duplicate serial number in paste text: "${sn}"`);
        return;
      }
      seen.add(lower);
      newRows.push({
        serialNumber: sn,
        conditionLabel: 'Standby Good',
        notes: '',
      });
    }

    setFormData((prev) => ({
      ...prev,
      serialRows:
        prev.serialRows.length === 1 && !prev.serialRows[0].serialNumber.trim()
          ? newRows
          : [...prev.serialRows, ...newRows],
    }));

    setPasteModalOpen(false);
    setPasteText('');
  };

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

    let cleanedSerialDetails: SerialItemEntry[] = [];
    if (isSerialized) {
      cleanedSerialDetails = formData.serialRows
        .map((r) => ({
          serialNumber: r.serialNumber.trim(),
          conditionLabel: r.conditionLabel,
          notes: r.notes.trim() || undefined as any,
        }))
        .filter((r) => r.serialNumber.length > 0);

      if (cleanedSerialDetails.length === 0) {
        setErrorMsg('At least one Serial Number is required for serialized items');
        return;
      }

      // Check for duplicates in form
      const seen = new Set<string>();
      for (const entry of cleanedSerialDetails) {
        const lower = entry.serialNumber.toLowerCase();
        if (seen.has(lower)) {
          setErrorMsg(`Duplicate Serial Number entered in form: "${entry.serialNumber}"`);
          return;
        }
        seen.add(lower);
      }
    } else {
      if (formData.quantity < 1) {
        setErrorMsg('Quantity must be at least 1');
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        movementType: 'INCOMING',
        movementDate: formData.movementDate,
        destinationWarehouseId: parseInt(formData.warehouseId, 10),
        referenceNumber: formData.referenceNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        items: [
          {
            itemId: parseInt(formData.itemId, 10),
            quantity: isSerialized ? cleanedSerialDetails.length : formData.quantity,
            serialNumbers: isSerialized ? cleanedSerialDetails.map((s) => s.serialNumber) : undefined,
            serialDetails: isSerialized
              ? cleanedSerialDetails.map((s) => ({
                  serialNumber: s.serialNumber,
                  conditionLabel: s.conditionLabel,
                  state: s.conditionLabel,
                  notes: s.notes,
                }))
              : undefined,
          },
        ],
      };

      await apiClient.post('/stock-movements/incoming', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while recording incoming stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !pasteModalOpen}
        onClose={onClose}
        title="Record Incoming Stock"
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && <div className="alert-error">{errorMsg}</div>}

            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Incoming Date" required style={{ marginBottom: 0 }}>
                <Input
                  type="date"
                  required
                  value={formData.movementDate}
                  onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
                />
              </FormField>

              <FormField label="Destination Warehouse" required style={{ marginBottom: 0 }}>
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

            <FormField label="Item" required>
              <Select
                required
                value={formData.itemId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    itemId: e.target.value,
                    serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
                    quantity: 1,
                  })
                }
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

            {/* BULK: Quantity input */}
            {!isSerialized ? (
              <FormField label="Quantity" required>
                <NumberInput
                  required
                  min={1}
                  value={formData.quantity}
                  onChange={(val) => setFormData({ ...formData, quantity: val })}
                />
              </FormField>
            ) : (
              /* SERIALIZED: Individual Serial Rows + Bulk Paste */
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Serial Numbers <span className="form-label-required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPasteModalOpen(true)}
                    >
                      <ClipboardList size={14} /> Paste SN List
                    </Button>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--accent-blue)',
                        backgroundColor: 'rgba(34, 80, 161, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Quantity: {formData.serialRows.filter((r) => r.serialNumber.trim()).length}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {formData.serialRows.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 1fr auto',
                        gap: '8px',
                        alignItems: 'center',
                        backgroundColor: '#F9FAFB',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <Input
                        type="text"
                        required
                        placeholder={`SN #${idx + 1}`}
                        value={row.serialNumber}
                        onChange={(e) => handleSerialRowChange(idx, 'serialNumber', e.target.value)}
                      />

                      <Select
                        value={row.conditionLabel}
                        onChange={(e) => handleSerialRowChange(idx, 'conditionLabel', e.target.value)}
                      >
                        <option value="Standby Good">Standby Good</option>
                        <option value="Standby Bad">Standby Bad</option>
                        <option value="Under Repair">Under Repair</option>
                      </Select>

                      <Input
                        type="text"
                        placeholder="Note (optional)"
                        value={row.notes}
                        onChange={(e) => handleSerialRowChange(idx, 'notes', e.target.value)}
                      />

                      {formData.serialRows.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => handleRemoveSerialField(idx)}
                          title="Remove Serial Row"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '10px' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSerialField}
                  >
                    <Plus size={14} /> Add Serial Number
                  </Button>
                </div>
              </div>
            )}

            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Reference / DO / PO No." style={{ marginBottom: 0 }}>
                <Input
                  type="text"
                  placeholder="e.g. PO-2026-001, SJ-998"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                />
              </FormField>

              <FormField label="Movement Notes" style={{ marginBottom: 0 }}>
                <Input
                  type="text"
                  placeholder="Optional remarks"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Record Incoming
            </Button>
          </div>
        </form>
      </Modal>

      {/* Paste Serial Numbers Modal */}
      <Modal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        title="Paste Serial Numbers"
        maxWidth="480px"
      >
        <div className="modal-body">
          {pasteError && <div className="alert-error">{pasteError}</div>}
          <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '8px' }}>
            Paste a list of Serial Numbers below (one per line). Whitespace will be trimmed automatically.
          </p>
          <Textarea
            rows={8}
            placeholder={`SN-001\nSN-002\nSN-003`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setPasteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApplyPastedSerials}>
            Apply Serial Numbers
          </Button>
        </div>
      </Modal>
    </>
  );
};

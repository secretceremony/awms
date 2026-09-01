import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, NumberInput, Select, Textarea, Button } from '../ui/index.js';
import { Plus, Trash2 } from 'lucide-react';
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
    itemId: '',
    warehouseId: '',
    quantity: 1,
    serialNumbers: [''],
    conditionLabel: 'Standby Good',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, whRes]: any = await Promise.all([
          apiClient.get('/items', { params: { limit: 100 } }),
          apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } }),
        ]);
        setItems(itemsRes?.data || []);
        setWarehouses(whRes?.data || []);
      } catch (err) {
        console.error('Failed to load initial stock dependencies:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setFormData({
        itemId: '',
        warehouseId: '',
        quantity: 1,
        serialNumbers: [''],
        conditionLabel: 'Standby Good',
        notes: '',
      });
      setErrorMsg(null);
    }
  }, [isOpen]);

  const selectedItem = items.find((i) => String(i.id) === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

  const handleAddSerialField = () => {
    setFormData((prev) => ({
      ...prev,
      serialNumbers: [...prev.serialNumbers, ''],
    }));
  };

  const handleRemoveSerialField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      serialNumbers: prev.serialNumbers.filter((_, i) => i !== index),
    }));
  };

  const handleSerialChange = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.serialNumbers];
      next[index] = value;
      return { ...prev, serialNumbers: next };
    });
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

    let cleanedSerials: string[] = [];
    if (isSerialized) {
      cleanedSerials = formData.serialNumbers.map((s) => s.trim()).filter(Boolean);
      if (cleanedSerials.length === 0) {
        setErrorMsg('At least one Serial Number is required for serialized items');
        return;
      }

      // Check for duplicates in form
      const seen = new Set<string>();
      for (const sn of cleanedSerials) {
        const lower = sn.toLowerCase();
        if (seen.has(lower)) {
          setErrorMsg(`Duplicate Serial Number entered in form: "${sn}"`);
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
        movementType: 'INITIAL',
        destinationWarehouseId: parseInt(formData.warehouseId, 10),
        items: [
          {
            itemId: parseInt(formData.itemId, 10),
            quantity: isSerialized ? cleanedSerials.length : formData.quantity,
            serialNumbers: isSerialized ? cleanedSerials : undefined,
            serialDetails: isSerialized
              ? cleanedSerials.map((sn) => ({
                  serialNumber: sn,
                  conditionLabel: formData.conditionLabel,
                  state: formData.conditionLabel,
                }))
              : undefined,
          },
        ],
      };

      await apiClient.post('/stock-movements', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while recording initial stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Initial Stock"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Warehouse" required>
            <Select
              required
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
            >
              <option value="">-- Select Warehouse --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Item" required>
            <Select
              required
              value={formData.itemId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  itemId: e.target.value,
                  serialNumbers: [''],
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
                <strong>{selectedItem.unit?.name || '-'}</strong>
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
            /* SERIALIZED: Dynamic Serial Numbers */
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Serial Numbers <span className="form-label-required">*</span>
                </label>
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
                  Quantity: {formData.serialNumbers.filter((s) => s.trim()).length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {formData.serialNumbers.map((sn, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Input
                      type="text"
                      required
                      placeholder={`Serial Number #${idx + 1}`}
                      value={sn}
                      onChange={(e) => handleSerialChange(idx, e.target.value)}
                    />
                    {formData.serialNumbers.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleRemoveSerialField(idx)}
                        title="Remove Serial Number"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '8px' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddSerialField}
                >
                  <Plus size={14} /> Add Serial Number
                </Button>
              </div>

              <FormField label="Condition / State" required style={{ marginTop: '12px', marginBottom: 0 }}>
                <Select
                  value={formData.conditionLabel}
                  onChange={(e) => setFormData({ ...formData, conditionLabel: e.target.value })}
                >
                  <option value="Standby Good">Standby Good</option>
                  <option value="Standby Bad">Standby Bad</option>
                  <option value="Under Repair">Under Repair</option>
                </Select>
              </FormField>
            </div>
          )}

          <FormField label="Notes">
            <Textarea
              placeholder="Optional remarks regarding initial stock entry"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving}>
            Record Initial Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};

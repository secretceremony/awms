import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, NumberInput, Select, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

interface ItemOption {
  id: number;
  name: string;
  trackingType: 'BULK' | 'SERIALIZED';
  brand: string | null;
}

interface WarehouseOption {
  id: number;
  name: string;
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
    itemId: '',
    warehouseId: '',
    quantity: 1,
    serialNumber: '',
    conditionLabel: 'Standby Good',
    referenceNumber: '',
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
        console.error('Failed to load incoming dependencies:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setFormData({
        itemId: '',
        warehouseId: '',
        quantity: 1,
        serialNumber: '',
        conditionLabel: 'Standby Good',
        referenceNumber: '',
        notes: '',
      });
      setErrorMsg(null);
    }
  }, [isOpen]);

  const selectedItem = items.find((i) => String(i.id) === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        movementType: 'INCOMING',
        referenceNumber: formData.referenceNumber.trim() || undefined,
        destinationWarehouseId: parseInt(formData.warehouseId, 10),
        items: [
          {
            itemId: parseInt(formData.itemId, 10),
            quantity: isSerialized ? 1 : formData.quantity,
            serialNumbers: isSerialized ? [formData.serialNumber.trim()] : undefined,
            serialDetails: isSerialized
              ? [
                  {
                    serialNumber: formData.serialNumber.trim(),
                    conditionLabel: formData.conditionLabel,
                    state: formData.conditionLabel,
                  },
                ]
              : undefined,
          },
        ],
      };

      await apiClient.post('/stock-movements/incoming', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while creating incoming movement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Incoming Stock"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

          <FormField label="Destination Warehouse" required>
            <Select
              required
              value={formData.warehouseId}
              onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
            >
              <option value="">-- Select Destination Warehouse --</option>
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
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
            >
              <option value="">-- Select Item --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.trackingType})
                </option>
              ))}
            </Select>
          </FormField>

          {/* Conditional Tracking Fields */}
          {!isSerialized ? (
            <FormField label="Quantity Received" required>
              <NumberInput
                required
                min={1}
                value={formData.quantity}
                onChange={(val) => setFormData({ ...formData, quantity: val })}
              />
            </FormField>
          ) : (
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Serial Number" required style={{ marginBottom: 0 }}>
                <Input
                  type="text"
                  required
                  placeholder="e.g. SN-INCOMING-12345"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </FormField>

              <FormField label="Condition / State" required style={{ marginBottom: 0 }}>
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

          <FormField label="Reference / PO Number">
            <Input
              type="text"
              placeholder="e.g. PO-2026-0042"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              placeholder="Optional notes regarding delivery or source"
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
            Record Incoming Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};

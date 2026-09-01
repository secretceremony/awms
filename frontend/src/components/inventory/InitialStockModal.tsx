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
    serialNumber: '',
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
        serialNumber: '',
        conditionLabel: 'Standby Good',
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
        movementType: 'INITIAL',
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

      await apiClient.post('/stock-movements', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while adding initial stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Initial Stock"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}

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

          <FormField label="Destination Warehouse" required>
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

          {/* Conditional Tracking Fields */}
          {!isSerialized ? (
            <FormField label="Initial Quantity" required>
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
                  placeholder="e.g. SN-987654321"
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

          <FormField label="Notes / Reference">
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

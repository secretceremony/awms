import React, { useState, useEffect, useRef } from 'react';
import { Modal, FormField, Input, Select, Button, SegmentedControl, ConfirmModal } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

export type MaterialType = 'MAIN_MATERIAL' | 'CONSUMABLE' | 'TOOLS' | 'HSE_MATERIAL';

export interface Item {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  materialType?: MaterialType | null;
  unitId: number;
  unit?: { id: number; name: string; symbol: string | null };
  isActive: boolean;
}

export interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  onSuccess: () => void;
}

const LAST_UNIT_KEY = 'awms_last_selected_unit_id';

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [units, setUnits] = useState<{ id: number; name: string; symbol: string | null }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    modelNumber: '',
    trackingType: null as 'BULK' | 'SERIALIZED' | null,
    materialType: 'MAIN_MATERIAL' as MaterialType,
    unitId: '',
  });

  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res: any = await apiClient.get('/units', { params: { status: 'active', limit: 100 } });
        const list = Array.isArray(res) ? res : res?.data || [];
        setUnits(list);

        if (!item) {
          // Rule 10: Remember last successfully selected Unit
          const savedUnitId = localStorage.getItem(LAST_UNIT_KEY);
          if (savedUnitId && list.some((u: any) => String(u.id) === savedUnitId)) {
            setFormData((prev) => ({ ...prev, unitId: savedUnitId }));
          }
        }
      } catch (err) {
        console.error('Failed to load active units:', err);
      }
    };

    if (isOpen) {
      fetchUnits();
      if (item) {
        const init = {
          name: item.name,
          brand: item.brand || '',
          modelNumber: item.modelNumber || '',
          trackingType: item.trackingType,
          materialType: (item.materialType || 'MAIN_MATERIAL') as MaterialType,
          unitId: String(item.unitId || item.unit?.id || ''),
        };
        setFormData(init);
        setInitialData(init);
      } else {
        const init = {
          name: '',
          brand: '',
          modelNumber: '',
          trackingType: null, // Rule 10: No default tracking type! User must explicitly choose.
          materialType: 'MAIN_MATERIAL' as MaterialType,
          unitId: '',
        };
        setFormData(init);
        setInitialData(init);
      }
      setErrorMsg(null);

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, item]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Item Name is required');
      return;
    }
    if (!formData.trackingType) {
      setErrorMsg('Please choose a Tracking Type (Bulk or Serialized)');
      return;
    }
    if (!formData.unitId) {
      setErrorMsg('Unit of Measurement is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        modelNumber: formData.modelNumber.trim() || undefined,
        trackingType: formData.trackingType,
        materialType: formData.materialType,
        unitId: Number(formData.unitId),
      };

      if (item) {
        await apiClient.patch(`/items/${item.id}`, payload);
      } else {
        await apiClient.post('/items', payload);
        // Save last unit choice in local storage
        localStorage.setItem(LAST_UNIT_KEY, String(formData.unitId));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={item ? 'Edit Master Item' : 'Add New Master Item'}
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <FormField label="Item Name" required>
              <Input
                ref={nameInputRef}
                placeholder="e.g. Cisco Switch 24-Port Gigabit"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>

            <FormField label="Material Type" required>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { value: 'MAIN_MATERIAL', label: 'Main Material' },
                  { value: 'CONSUMABLE', label: 'Consumable' },
                  { value: 'TOOLS', label: 'Tools' },
                  { value: 'HSE_MATERIAL', label: 'HSE Material' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      border: formData.materialType === opt.value ? '2px solid #2250A1' : '1px solid #E2E8F0',
                      borderRadius: '6px',
                      backgroundColor: formData.materialType === opt.value ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: formData.materialType === opt.value ? 600 : 500,
                      color: formData.materialType === opt.value ? '#2250A1' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="materialType"
                      value={opt.value}
                      checked={formData.materialType === opt.value}
                      onChange={() => setFormData({ ...formData, materialType: opt.value as MaterialType })}
                      style={{ accentColor: '#2250A1' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </FormField>

            <FormField label="Tracking Type" required>
              <SegmentedControl<'BULK' | 'SERIALIZED'>
                value={formData.trackingType}
                onChange={(val) => setFormData({ ...formData, trackingType: val })}
                options={[
                  { value: 'BULK', label: 'Bulk Item (Tracked by Quantity)' },
                  { value: 'SERIALIZED', label: 'Serialized (Tracked by Unique SN)' },
                ]}
              />
            </FormField>

            <FormField label="Unit of Measurement" required>
              <Select
                required
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              >
                <option value="">Select Unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.symbol ? `(${u.symbol})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="form-grid">
              <FormField label="Brand / Manufacturer">
                <Input
                  placeholder="e.g. Cisco, Dell, Panduit"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </FormField>

              <FormField label="Model Number (MN)">
                <Input
                  placeholder="e.g. WS-C2960X-24TS-L"
                  value={formData.modelNumber}
                  onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {item ? 'Save Changes' : 'Create Item'}
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

export default ItemFormModal;

import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Textarea, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Plus, Trash2, Warehouse, Check } from 'lucide-react';

export interface AvailableItem {
  id: string;
  trackingType: 'BULK' | 'SERIALIZED';
  itemId: number;
  itemSerialId?: number;
  serialNumber?: string;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  warehouseId: number;
  warehouseName: string;
  cityCode: string;
  availableQty: number;
  condition?: string;
  unit: string;
  unitSymbol: string;
}

export interface SelectedOutgoingItem {
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  warehouseId: number;
  warehouseName: string;
  cityCode: string;
  quantity: number;
  unitSymbol: string;
  serialNumbers?: string[];
  maxAvailableQty: number;
}

export interface AddOutgoingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddOutgoingModal: React.FC<AddOutgoingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Inventory search & selection
  const [availableInventory, setAvailableInventory] = useState<AvailableItem[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedOutgoingItem[]>([]);
  const [establishedWarehouseId, setEstablishedWarehouseId] = useState<number | null>(null);

  const [isLoadingInv, setIsLoadingInv] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch active projects on open
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res: any = await apiClient.get('/projects', { params: { limit: 100, status: 'ACTIVE' } });
        setProjects(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to load active projects:', err);
      }
    };

    if (isOpen) {
      fetchProjects();
      setSelectedProjectId('');
      setMovementDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSelectedItems([]);
      setEstablishedWarehouseId(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Fetch available warehouse inventory
  useEffect(() => {
    const fetchAvailable = async () => {
      if (!isOpen) return;
      setIsLoadingInv(true);
      try {
        const data = await apiClient.get<AvailableItem[]>('/stock-movements/available-inventory', {
          params: { search: invSearch || undefined },
        });
        setAvailableInventory(data);
      } catch (err) {
        console.error('Failed to load available inventory:', err);
      } finally {
        setIsLoadingInv(false);
      }
    };

    const timer = setTimeout(fetchAvailable, 250);
    return () => clearTimeout(timer);
  }, [isOpen, invSearch]);

  const handleSelectBulk = (inv: AvailableItem) => {
    setErrorMsg(null);
    if (establishedWarehouseId !== null && establishedWarehouseId !== inv.warehouseId) {
      setErrorMsg('Outgoing items must come from the same Warehouse.');
      return;
    }

    const existingIdx = selectedItems.findIndex(
      (si) => si.itemId === inv.itemId && si.trackingType === 'BULK',
    );

    if (existingIdx >= 0) {
      setErrorMsg(`Item "${inv.itemName}" is already in your selected list. Adjust quantity below.`);
      return;
    }

    if (establishedWarehouseId === null) {
      setEstablishedWarehouseId(inv.warehouseId);
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: inv.itemId,
        itemName: inv.itemName,
        brand: inv.brand,
        modelNumber: inv.modelNumber,
        trackingType: 'BULK',
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouseName,
        cityCode: inv.cityCode,
        quantity: 1,
        unitSymbol: inv.unitSymbol,
        maxAvailableQty: inv.availableQty,
      },
    ]);
  };

  const handleToggleSerialized = (inv: AvailableItem) => {
    setErrorMsg(null);
    if (!inv.serialNumber) return;

    if (establishedWarehouseId !== null && establishedWarehouseId !== inv.warehouseId) {
      setErrorMsg('Outgoing items must come from the same Warehouse.');
      return;
    }

    const existingIdx = selectedItems.findIndex((si) => si.itemId === inv.itemId);

    if (existingIdx >= 0) {
      const existing = selectedItems[existingIdx];
      const snList = existing.serialNumbers || [];
      const snExists = snList.includes(inv.serialNumber);

      let newSnList: string[];
      if (snExists) {
        newSnList = snList.filter((s) => s !== inv.serialNumber);
      } else {
        newSnList = [...snList, inv.serialNumber];
      }

      if (newSnList.length === 0) {
        // Remove item row if 0 SNs selected
        const updated = selectedItems.filter((_, i) => i !== existingIdx);
        setSelectedItems(updated);
        if (updated.length === 0) {
          setEstablishedWarehouseId(null);
        }
      } else {
        const updated = [...selectedItems];
        updated[existingIdx] = {
          ...existing,
          quantity: newSnList.length,
          serialNumbers: newSnList,
        };
        setSelectedItems(updated);
      }
    } else {
      if (establishedWarehouseId === null) {
        setEstablishedWarehouseId(inv.warehouseId);
      }

      setSelectedItems((prev) => [
        ...prev,
        {
          itemId: inv.itemId,
          itemName: inv.itemName,
          brand: inv.brand,
          modelNumber: inv.modelNumber,
          trackingType: 'SERIALIZED',
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouseName,
          cityCode: inv.cityCode,
          quantity: 1,
          unitSymbol: inv.unitSymbol,
          serialNumbers: [inv.serialNumber!],
          maxAvailableQty: inv.availableQty,
        },
      ]);
    }
  };

  const handleUpdateBulkQty = (itemId: number, newQty: number) => {
    setSelectedItems((prev) =>
      prev.map((si) => {
        if (si.itemId === itemId && si.trackingType === 'BULK') {
          const clamped = Math.max(1, Math.min(newQty, si.maxAvailableQty));
          return { ...si, quantity: clamped };
        }
        return si;
      }),
    );
  };

  const handleRemoveItem = (itemId: number) => {
    const updated = selectedItems.filter((si) => si.itemId !== itemId);
    setSelectedItems(updated);
    if (updated.length === 0) {
      setEstablishedWarehouseId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProjectId) {
      setErrorMsg('Please select an active destination Project');
      return;
    }

    if (!notes.trim()) {
      setErrorMsg('Manual dispatch reason is required for manual outgoing movements.');
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least one item or serial number for outgoing dispatch');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        movementDate,
        projectId: parseInt(selectedProjectId, 10),
        sourceWarehouseId: establishedWarehouseId || undefined,
        notes: notes.trim() || undefined,
        items: selectedItems.map((si) => ({
          itemId: si.itemId,
          quantity: si.quantity,
          serialNumbers: si.trackingType === 'SERIALIZED' ? si.serialNumbers : undefined,
        })),
      };

      await apiClient.post('/stock-movements/outgoing', payload);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record outgoing stock movement');
    } finally {
      setIsSaving(false);
    }
  };

  const currentWh = availableInventory.find((i) => i.warehouseId === establishedWarehouseId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Outgoing Stock Movement"
      maxWidth="850px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

          {/* Destination Project & Movement Date */}
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <FormField label="Movement Date" required style={{ marginBottom: 0 }}>
              <Input
                type="date"
                required
                value={movementDate}
                onChange={(e) => setMovementDate(e.target.value)}
              />
            </FormField>

            <FormField label="Destination Project (Active Only)" required style={{ marginBottom: 0 }}>
              <Select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">Select Destination Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.siteCode ? `[${p.siteCode}]` : ''} {p.client ? `— ${p.client.name}` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Source Warehouse Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              backgroundColor: establishedWarehouseId ? 'rgba(34, 80, 161, 0.08)' : '#F3F4F6',
              border: `1px solid ${establishedWarehouseId ? 'rgba(34, 80, 161, 0.2)' : '#E5E7EB'}`,
              borderRadius: '6px',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Warehouse size={18} style={{ color: establishedWarehouseId ? '#2250A1' : '#6B7280' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2839' }}>
                Source Warehouse:
              </span>
              <span style={{ fontSize: '0.875rem', color: establishedWarehouseId ? '#2250A1' : '#6B7280', fontWeight: establishedWarehouseId ? 700 : 400 }}>
                {establishedWarehouseId
                  ? `${currentWh?.warehouseName || 'Warehouse'} (${currentWh?.cityCode || establishedWarehouseId})`
                  : 'Auto-inferred from selected inventory'}
              </span>
            </div>
            {establishedWarehouseId && (
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                (1 Warehouse per Outgoing transaction)
              </span>
            )}
          </div>

          {/* Available Inventory Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1F2839' }}>
                1. Select Available Inventory
              </div>
              <div style={{ width: '280px' }}>
                <Input
                  type="text"
                  placeholder="Search item, brand, MN, SN..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                maxHeight: '220px',
                overflowY: 'auto',
                backgroundColor: '#FFFFFF',
              }}
            >
              {isLoadingInv ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                  Loading available inventory...
                </div>
              ) : availableInventory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                  No available inventory matching your search.
                </div>
              ) : (
                <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Action</th>
                      <th>Item / Brand</th>
                      <th>MN / SN</th>
                      <th>Type</th>
                      <th>Warehouse</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableInventory.map((inv) => {
                      const isSelectedWh =
                        establishedWarehouseId === null || establishedWarehouseId === inv.warehouseId;
                      const isBulkSelected = selectedItems.some(
                        (si) => si.itemId === inv.itemId && si.trackingType === 'BULK',
                      );
                      const isSnSelected =
                        inv.trackingType === 'SERIALIZED' &&
                        selectedItems.some(
                          (si) => si.itemId === inv.itemId && si.serialNumbers?.includes(inv.serialNumber || ''),
                        );

                      return (
                        <tr
                          key={inv.id}
                          style={{
                            opacity: isSelectedWh ? 1 : 0.45,
                            backgroundColor: isBulkSelected || isSnSelected ? 'rgba(34, 80, 161, 0.04)' : undefined,
                          }}
                        >
                          <td>
                            {inv.trackingType === 'BULK' ? (
                              <Button
                                variant={isBulkSelected ? 'secondary' : 'primary'}
                                size="sm"
                                type="button"
                                disabled={!isSelectedWh || isBulkSelected}
                                onClick={() => handleSelectBulk(inv)}
                              >
                                {isBulkSelected ? <Check size={12} /> : <Plus size={12} />}
                              </Button>
                            ) : (
                              <input
                                type="checkbox"
                                disabled={!isSelectedWh}
                                checked={Boolean(isSnSelected)}
                                onChange={() => handleToggleSerialized(inv)}
                                style={{ cursor: isSelectedWh ? 'pointer' : 'not-allowed' }}
                              />
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1F2839' }}>{inv.itemName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{inv.brand || '—'}</div>
                          </td>
                          <td>
                            {inv.trackingType === 'SERIALIZED' ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2250A1' }}>
                                {inv.serialNumber}
                              </span>
                            ) : (
                              <span>{inv.modelNumber || '—'}</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor:
                                  inv.trackingType === 'SERIALIZED' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                color: inv.trackingType === 'SERIALIZED' ? '#8B5CF6' : '#0891B2',
                              }}
                            >
                              {inv.trackingType}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{inv.cityCode || inv.warehouseName}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }}>
                              {inv.availableQty} {inv.unitSymbol}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Selected Outgoing Items Summary */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1F2839', marginBottom: '0.5rem' }}>
              2. Items in this Outgoing Movement ({selectedItems.length})
            </div>

            {selectedItems.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  border: '1px dashed #E5E7EB',
                  borderRadius: '6px',
                  color: '#6B7280',
                  fontSize: '0.875rem',
                }}
              >
                No items selected yet. Choose bulk items or serial numbers from the table above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedItems.map((si) => (
                  <div
                    key={si.itemId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#1F2839' }}>{si.itemName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {si.brand ? `${si.brand} • ` : ''}
                        Wh: {si.cityCode || si.warehouseName} • Type: {si.trackingType}
                      </div>
                      {si.trackingType === 'SERIALIZED' && si.serialNumbers && (
                        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {si.serialNumbers.map((sn) => (
                            <span
                              key={sn}
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                backgroundColor: 'rgba(34, 80, 161, 0.08)',
                                color: '#2250A1',
                                border: '1px solid rgba(34, 80, 161, 0.2)',
                              }}
                            >
                              {sn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {si.trackingType === 'BULK' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Qty:</span>
                          <input
                            type="number"
                            min="1"
                            max={si.maxAvailableQty}
                            value={si.quantity}
                            onChange={(e) => handleUpdateBulkQty(si.itemId, parseInt(e.target.value, 10) || 1)}
                            style={{
                              width: '70px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #D1D5DB',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          />
                          <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                            / {si.maxAvailableQty} {si.unitSymbol}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2839' }}>
                          {si.quantity} unit(s)
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => handleRemoveItem(si.itemId)}
                        title="Remove Item"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Dispatch Reason */}
          <FormField label="Manual Dispatch Reason" required>
            <Textarea
              required
              placeholder="e.g. Urgent site replacement, field deployment, scheduled project installation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving} disabled={selectedItems.length === 0}>
            Submit Outgoing Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Modal,
  FormField,
  Input,
  NumberInput,
  Select,
  Textarea,
  Button,
} from '../ui/index.js';
import { Plus, Trash2, ClipboardList, RotateCcw, PackageCheck } from 'lucide-react';
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

interface ProjectOption {
  id: number;
  name: string;
  siteCode: string | null;
  status: string;
  client?: { name: string };
}

interface ProjectInventoryItem {
  id: string;
  trackingType: 'BULK' | 'SERIALIZED';
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  availableQty: number;
  unit: string;
  unitSymbol: string;
  itemSerialId?: number;
  serialNumber?: string;
  condition?: string;
  state?: string;
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
  const [sourceType, setSourceType] = useState<'REGULAR' | 'RETURN'>('REGULAR');

  // Common dependencies
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  // Regular Incoming form state
  const [regularForm, setRegularForm] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    itemId: '',
    quantity: 1,
    serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }] as SerialItemEntry[],
    referenceNumber: '',
    notes: '',
  });

  // Project Return form state
  const [returnForm, setReturnForm] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    projectId: '',
    warehouseId: '',
    referenceNumber: '',
    notes: '',
  });

  const [projectInventory, setProjectInventory] = useState<ProjectInventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Return selection state
  const [selectedBulkReturns, setSelectedBulkReturns] = useState<{ [itemId: number]: number }>({});
  const [selectedSerialReturns, setSelectedSerialReturns] = useState<{
    [sn: string]: { selected: boolean; conditionLabel: string; notes: string };
  }>({});

  // Multi-paste modal for regular incoming
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, whRes, projRes]: any = await Promise.all([
          apiClient.get('/items', { params: { limit: 100 } }),
          apiClient.get('/warehouses', { params: { limit: 100, status: 'active' } }),
          apiClient.get('/projects', { params: { limit: 100 } }),
        ]);
        setItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.data || []);
        setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
        setProjects(Array.isArray(projRes) ? projRes : projRes?.data || []);
      } catch (err) {
        console.error('Failed to load dependencies:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setSourceType('REGULAR');
      setRegularForm({
        movementDate: new Date().toISOString().split('T')[0],
        warehouseId: '',
        itemId: '',
        quantity: 1,
        serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
        referenceNumber: '',
        notes: '',
      });
      setReturnForm({
        movementDate: new Date().toISOString().split('T')[0],
        projectId: '',
        warehouseId: '',
        referenceNumber: '',
        notes: '',
      });
      setProjectInventory([]);
      setSelectedBulkReturns({});
      setSelectedSerialReturns({});
      setErrorMsg(null);
      setPasteModalOpen(false);
      setPasteText('');
      setPasteError(null);
    }
  }, [isOpen]);

  // Load project inventory when project selected in Return mode
  useEffect(() => {
    const fetchProjectInventory = async () => {
      if (sourceType !== 'RETURN' || !returnForm.projectId) {
        setProjectInventory([]);
        return;
      }
      setIsLoadingInventory(true);
      setErrorMsg(null);
      try {
        const res: any = await apiClient.get('/stock-movements/project-inventory', {
          params: { projectId: returnForm.projectId },
        });
        const invList: ProjectInventoryItem[] = Array.isArray(res) ? res : res?.data || [];
        setProjectInventory(invList);

        // Reset return selections
        setSelectedBulkReturns({});
        const snInitial: any = {};
        invList
          .filter((i) => i.trackingType === 'SERIALIZED' && i.serialNumber)
          .forEach((s) => {
            snInitial[s.serialNumber!] = {
              selected: false,
              conditionLabel: s.condition || 'Standby Good',
              notes: '',
            };
          });
        setSelectedSerialReturns(snInitial);
      } catch (err: any) {
        console.error('Failed to load project inventory:', err);
        setErrorMsg(err.message || 'Failed to load project inventory');
      } finally {
        setIsLoadingInventory(false);
      }
    };

    fetchProjectInventory();
  }, [sourceType, returnForm.projectId]);

  // --- Regular Incoming Handlers ---
  const selectedRegularItem = items.find((i) => String(i.id) === regularForm.itemId);
  const isRegularSerialized = selectedRegularItem?.trackingType === 'SERIALIZED';

  const handleAddSerialField = () => {
    setRegularForm((prev) => ({
      ...prev,
      serialRows: [...prev.serialRows, { serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
    }));
  };

  const handleRemoveSerialField = (index: number) => {
    setRegularForm((prev) => ({
      ...prev,
      serialRows: prev.serialRows.filter((_, i) => i !== index),
    }));
  };

  const handleSerialChange = (index: number, field: keyof SerialItemEntry, value: string) => {
    setRegularForm((prev) => {
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

    setRegularForm((prev) => ({
      ...prev,
      serialRows: newRows,
    }));
    setPasteModalOpen(false);
    setPasteText('');
  };

  // --- Project Return Handlers ---
  const handleBulkReturnQtyChange = (itemId: number, qty: number, maxQty: number) => {
    if (qty <= 0) {
      const copy = { ...selectedBulkReturns };
      delete copy[itemId];
      setSelectedBulkReturns(copy);
    } else {
      setSelectedBulkReturns({
        ...selectedBulkReturns,
        [itemId]: Math.min(qty, maxQty),
      });
    }
  };

  const handleSerialSelectToggle = (sn: string) => {
    setSelectedSerialReturns((prev) => ({
      ...prev,
      [sn]: {
        ...prev[sn],
        selected: !prev[sn]?.selected,
      },
    }));
  };

  const handleSerialReturnConditionChange = (sn: string, cond: string) => {
    setSelectedSerialReturns((prev) => ({
      ...prev,
      [sn]: {
        ...prev[sn],
        conditionLabel: cond,
      },
    }));
  };

  const handleSerialReturnNotesChange = (sn: string, notes: string) => {
    setSelectedSerialReturns((prev) => ({
      ...prev,
      [sn]: {
        ...prev[sn],
        notes,
      },
    }));
  };

  // --- Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      if (sourceType === 'REGULAR') {
        if (!regularForm.warehouseId) {
          throw new Error('Please select a destination warehouse');
        }
        if (!regularForm.itemId) {
          throw new Error('Please select an item');
        }

        let itemsPayload: any[] = [];
        if (isRegularSerialized) {
          const serials = regularForm.serialRows.map((r) => ({
            serialNumber: r.serialNumber.trim(),
            conditionLabel: r.conditionLabel,
            notes: r.notes.trim() || undefined,
          }));

          const emptySerials = serials.filter((s) => !s.serialNumber);
          if (emptySerials.length > 0) {
            throw new Error('All serial numbers must be specified');
          }

          const snSet = new Set<string>();
          for (const s of serials) {
            if (snSet.has(s.serialNumber)) {
              throw new Error(`Duplicate serial number in form: ${s.serialNumber}`);
            }
            snSet.add(s.serialNumber);
          }

          itemsPayload = [
            {
              itemId: Number(regularForm.itemId),
              quantity: serials.length,
              serialDetails: serials,
            },
          ];
        } else {
          if (regularForm.quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
          }
          itemsPayload = [
            {
              itemId: Number(regularForm.itemId),
              quantity: Number(regularForm.quantity),
            },
          ];
        }

        await apiClient.post('/stock-movements/incoming', {
          movementType: 'INCOMING',
          movementDate: regularForm.movementDate,
          destinationWarehouseId: Number(regularForm.warehouseId),
          referenceNumber: regularForm.referenceNumber.trim() || undefined,
          notes: regularForm.notes.trim() || undefined,
          items: itemsPayload,
        });
      } else {
        if (!returnForm.projectId) {
          throw new Error('Please select a Source Project');
        }
        if (!returnForm.warehouseId) {
          throw new Error('Please select a Destination Warehouse');
        }

        const returnItemsMap: { [itemId: number]: { quantity: number; serialDetails?: any[] } } = {};

        // 1. Collect Bulk returns
        Object.entries(selectedBulkReturns).forEach(([itemIdStr, qty]) => {
          const itemId = Number(itemIdStr);
          if (qty > 0) {
            returnItemsMap[itemId] = { quantity: qty };
          }
        });

        // 2. Collect Serialized returns
        const selectedSns = Object.entries(selectedSerialReturns).filter(([_, sData]) => sData.selected);
        for (const [sn, sData] of selectedSns) {
          const invItem = projectInventory.find((p) => p.serialNumber === sn);
          if (invItem) {
            if (!returnItemsMap[invItem.itemId]) {
              returnItemsMap[invItem.itemId] = { quantity: 0, serialDetails: [] };
            }
            returnItemsMap[invItem.itemId].quantity += 1;
            if (!returnItemsMap[invItem.itemId].serialDetails) {
              returnItemsMap[invItem.itemId].serialDetails = [];
            }
            returnItemsMap[invItem.itemId].serialDetails!.push({
              serialNumber: sn,
              conditionLabel: sData.conditionLabel,
              notes: sData.notes.trim() || undefined,
            });
          }
        }

        const itemsPayload = Object.entries(returnItemsMap).map(([itemIdStr, it]) => ({
          itemId: Number(itemIdStr),
          quantity: it.quantity,
          serialDetails: it.serialDetails,
        }));

        if (itemsPayload.length === 0) {
          throw new Error('Please select at least one bulk item quantity or serialized asset to return');
        }

        await apiClient.post('/stock-movements/incoming', {
          movementType: 'RETURN',
          movementDate: returnForm.movementDate,
          projectId: Number(returnForm.projectId),
          destinationWarehouseId: Number(returnForm.warehouseId),
          referenceNumber: returnForm.referenceNumber.trim() || undefined,
          notes: returnForm.notes.trim() || undefined,
          items: itemsPayload,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record incoming movement');
    } finally {
      setIsSaving(false);
    }
  };

  const bulkProjectItems = projectInventory.filter((i) => i.trackingType === 'BULK');
  const serializedProjectItems = projectInventory.filter((i) => i.trackingType === 'SERIALIZED');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={sourceType === 'REGULAR' ? 'Record Incoming Stock' : 'Record Project Return / Recheck'}
        maxWidth="840px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
                {errorMsg}
              </div>
            )}

            {/* 1. Incoming Source Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1F2839',
                  marginBottom: '6px',
                }}
              >
                Incoming Source *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSourceType('REGULAR')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: `1.5px solid ${sourceType === 'REGULAR' ? '#2250A1' : '#E5E7EB'}`,
                    backgroundColor: sourceType === 'REGULAR' ? '#EFF6FF' : '#FFFFFF',
                    color: sourceType === 'REGULAR' ? '#2250A1' : '#4B5563',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <PackageCheck size={18} />
                  <div>
                    <div>External / Regular Incoming</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6B7280' }}>
                      Goods received from external supplier into Warehouse
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('RETURN')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: `1.5px solid ${sourceType === 'RETURN' ? '#8B5CF6' : '#E5E7EB'}`,
                    backgroundColor: sourceType === 'RETURN' ? '#F5F3FF' : '#FFFFFF',
                    color: sourceType === 'RETURN' ? '#7C3AED' : '#4B5563',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <RotateCcw size={18} />
                  <div>
                    <div>Project Return / Recheck</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6B7280' }}>
                      Goods returning from active/completed Project into Warehouse
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '1rem 0' }} />

            {/* A. REGULAR INCOMING FORM */}
            {sourceType === 'REGULAR' && (
              <div>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Movement Date" required style={{ marginBottom: 0 }}>
                    <Input
                      type="date"
                      required
                      value={regularForm.movementDate}
                      onChange={(e) => setRegularForm({ ...regularForm, movementDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Destination Warehouse" required style={{ marginBottom: 0 }}>
                    <Select
                      required
                      value={regularForm.warehouseId}
                      onChange={(e) => setRegularForm({ ...regularForm, warehouseId: e.target.value })}
                    >
                      <option value="">Select Warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.cityCode ? `[${w.cityCode}]` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Item Master" required style={{ marginBottom: 0 }}>
                    <Select
                      required
                      value={regularForm.itemId}
                      onChange={(e) => setRegularForm({ ...regularForm, itemId: e.target.value })}
                    >
                      <option value="">Select Item...</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} {i.brand ? `(${i.brand})` : ''} — {i.trackingType}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  {!isRegularSerialized ? (
                    <FormField label="Quantity" required style={{ marginBottom: 0 }}>
                      <NumberInput
                        min={1}
                        required
                        value={regularForm.quantity}
                        onChange={(val) => setRegularForm({ ...regularForm, quantity: val || 1 })}
                      />
                    </FormField>
                  ) : (
                    <FormField label="Total Serial Numbers" style={{ marginBottom: 0 }}>
                      <div style={{ paddingTop: '8px', fontWeight: 600, color: '#2250A1' }}>
                        {regularForm.serialRows.length} Serial Unit(s)
                      </div>
                    </FormField>
                  )}
                </div>

                {isRegularSerialized && (
                  <div
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '1rem',
                      backgroundColor: '#F9FAFB',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1F2839' }}>
                        Serial Numbers &amp; Condition ({regularForm.serialRows.length})
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {regularForm.serialRows.map((row, idx) => (
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
                          {regularForm.serialRows.length > 1 && (
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

                <div className="form-grid">
                  <FormField label="Reference Number (PO / Contract / Waybill)" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="e.g. PO-2026-001, WB-9988..."
                      value={regularForm.referenceNumber}
                      onChange={(e) => setRegularForm({ ...regularForm, referenceNumber: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Notes / Remarks" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="e.g. Received in good condition..."
                      value={regularForm.notes}
                      onChange={(e) => setRegularForm({ ...regularForm, notes: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* B. PROJECT RETURN / RECHECK FORM */}
            {sourceType === 'RETURN' && (
              <div>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Movement Date" required style={{ marginBottom: 0 }}>
                    <Input
                      type="date"
                      required
                      value={returnForm.movementDate}
                      onChange={(e) => setReturnForm({ ...returnForm, movementDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Source Project (Active or Completed)" required style={{ marginBottom: 0 }}>
                    <Select
                      required
                      value={returnForm.projectId}
                      onChange={(e) => setReturnForm({ ...returnForm, projectId: e.target.value })}
                    >
                      <option value="">Select Project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.siteCode ? `[${p.siteCode}]` : ''} ({p.status})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Destination Warehouse" required style={{ marginBottom: 0 }}>
                    <Select
                      required
                      value={returnForm.warehouseId}
                      onChange={(e) => setReturnForm({ ...returnForm, warehouseId: e.target.value })}
                    >
                      <option value="">Select Destination Warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.cityCode ? `[${w.cityCode}]` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="DO Reference / Return Reference" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="e.g. DO-PHM-2026-001, RET-09..."
                      value={returnForm.referenceNumber}
                      onChange={(e) => setReturnForm({ ...returnForm, referenceNumber: e.target.value })}
                    />
                  </FormField>
                </div>

                {/* Project Inventory Section */}
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#1F2839' }}>
                    Current Project Inventory (Select items/serials to return)
                  </h4>

                  {!returnForm.projectId ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '6px', color: '#6B7280', fontSize: '0.85rem' }}>
                      Select a Source Project above to view its active inventory.
                    </div>
                  ) : isLoadingInventory ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6B7280' }}>
                      Loading project inventory...
                    </div>
                  ) : projectInventory.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#B91C1C', fontSize: '0.85rem' }}>
                      No inventory currently deployed at this project.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Bulk Items at Project */}
                      {bulkProjectItems.length > 0 && (
                        <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>
                            Bulk Stock ({bulkProjectItems.length} items)
                          </div>
                          <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>Item Description</th>
                                <th>At Project</th>
                                <th style={{ width: '130px' }}>Return Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkProjectItems.map((b) => (
                                <tr key={b.id}>
                                  <td>
                                    <div style={{ fontWeight: 600, color: '#1F2839' }}>{b.itemName}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                      {b.brand && `${b.brand} `} {b.modelNumber && `| MN: ${b.modelNumber}`}
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {b.availableQty} {b.unitSymbol}
                                  </td>
                                  <td>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={b.availableQty}
                                      placeholder="0"
                                      value={selectedBulkReturns[b.itemId] || ''}
                                      onChange={(e) =>
                                        handleBulkReturnQtyChange(
                                          b.itemId,
                                          parseInt(e.target.value, 10) || 0,
                                          b.availableQty,
                                        )
                                      }
                                      style={{ width: '100px', padding: '4px 8px' }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Serialized Items at Project */}
                      {serializedProjectItems.length > 0 && (
                        <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 12px', backgroundColor: '#F3F4F6', fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>
                            Serialized Assets ({serializedProjectItems.length} units deployed)
                          </div>
                          <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '35px' }}></th>
                                <th>Item / SN</th>
                                <th style={{ width: '160px' }}>Returned Condition *</th>
                                <th style={{ width: '180px' }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {serializedProjectItems.map((s) => {
                                const sn = s.serialNumber!;
                                const stateEntry = selectedSerialReturns[sn] || {
                                  selected: false,
                                  conditionLabel: 'Standby Good',
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
                                        onChange={() => handleSerialSelectToggle(sn)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 600, color: '#1F2839' }}>{s.itemName}</div>
                                      <span
                                        style={{
                                          fontFamily: 'monospace',
                                          fontWeight: 700,
                                          color: '#7C3AED',
                                          fontSize: '0.8rem',
                                        }}
                                      >
                                        {sn}
                                      </span>
                                    </td>
                                    <td>
                                      <Select
                                        disabled={!stateEntry.selected}
                                        value={stateEntry.conditionLabel}
                                        onChange={(e) =>
                                          handleSerialReturnConditionChange(sn, e.target.value)
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
                                        placeholder="Inspection note..."
                                        value={stateEntry.notes}
                                        onChange={(e) =>
                                          handleSerialReturnNotesChange(sn, e.target.value)
                                        }
                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <FormField label="Notes / Reason for Return" style={{ marginBottom: 0 }}>
                  <Textarea
                    placeholder="e.g. Project completion return, equipment demob, recheck needed..."
                    value={returnForm.notes}
                    onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  />
                </FormField>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {sourceType === 'REGULAR' ? 'Record Incoming' : 'Record Project Return'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Multi-SN Paste Modal for Regular Incoming */}
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
    </>
  );
};

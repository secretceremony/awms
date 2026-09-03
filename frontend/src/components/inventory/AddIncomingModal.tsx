import React, { useState, useEffect } from 'react';
import {
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  SegmentedControl,
  QuantityStepper,
  SearchableSelect,
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

export interface SerialItemEntry {
  serialNumber: string;
  conditionLabel: string;
  notes: string;
}

export interface StagedIncomingItem {
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unitSymbol: string;
  quantity: number;
  serialRows?: SerialItemEntry[];
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

  // Regular Incoming Header state
  const [regularForm, setRegularForm] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    warehouseId: '',
    referenceNumber: '',
    notes: '',
  });

  // Staged multi-items for regular incoming
  const [stagedItems, setStagedItems] = useState<StagedIncomingItem[]>([]);

  // Active item entry inputs (for adding to staged list)
  const [activeItemId, setActiveItemId] = useState('');
  const [activeQuantity, setActiveQuantity] = useState(1);
  const [activeSerialRows, setActiveSerialRows] = useState<SerialItemEntry[]>([
    { serialNumber: '', conditionLabel: 'Standby Good', notes: '' },
  ]);

  // Project Return form state
  const [returnForm, setReturnForm] = useState({
    movementDate: new Date().toISOString().split('T')[0],
    projectId: '',
    warehouseId: '',
    referenceNumber: '',
    notes: '',
  });

  const [projectInventory, setProjectInventory] = useState<ProjectInventoryItem[]>([]);
  const [snSearch, setSnSearch] = useState('');
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Return selection state
  const [selectedBulkReturns, setSelectedBulkReturns] = useState<{ [itemId: number]: number }>({});
  const [selectedSerialReturns, setSelectedSerialReturns] = useState<{
    [sn: string]: { selected: boolean; conditionLabel: string; notes: string };
  }>({});

  // Multi-paste modal for regular incoming serials
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteCondition, setPasteCondition] = useState<string>('Standby Good');
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
        referenceNumber: '',
        notes: '',
      });
      setStagedItems([]);
      setActiveItemId('');
      setActiveQuantity(1);
      setActiveSerialRows([{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }]);

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
    }
  }, [isOpen]);

  // Load project inventory when project changes for Project Return
  useEffect(() => {
    const fetchProjectInventory = async () => {
      if (!returnForm.projectId) {
        setProjectInventory([]);
        setSelectedBulkReturns({});
        setSelectedSerialReturns({});
        return;
      }

      setIsLoadingInventory(true);
      try {
        const res: any = await apiClient.get(`/projects/${returnForm.projectId}/inventory`);
        const list: ProjectInventoryItem[] = Array.isArray(res) ? res : res?.data || [];
        setProjectInventory(list);

        const initialSerials: any = {};
        list.forEach((it) => {
          if (it.trackingType === 'SERIALIZED' && it.serialNumber) {
            initialSerials[it.serialNumber] = {
              selected: false,
              conditionLabel: it.condition || 'Standby Good',
              notes: '',
            };
          }
        });
        setSelectedSerialReturns(initialSerials);
        setSelectedBulkReturns({});
      } catch (err) {
        console.error('Failed to load project inventory:', err);
      } finally {
        setIsLoadingInventory(false);
      }
    };

    if (sourceType === 'RETURN' && returnForm.projectId) {
      fetchProjectInventory();
    }
  }, [returnForm.projectId, sourceType]);

  const selectedActiveItem = items.find((i) => String(i.id) === activeItemId);
  const isActiveItemSerialized = selectedActiveItem?.trackingType === 'SERIALIZED';

  // --- Staging Regular Item ---
  const handleAddActiveItemToStaged = () => {
    if (!activeItemId || !selectedActiveItem) {
      setErrorMsg('Please select an item to add');
      return;
    }

    if (isActiveItemSerialized) {
      const validSerials = activeSerialRows
        .map((r) => ({
          serialNumber: r.serialNumber.trim(),
          conditionLabel: r.conditionLabel,
          notes: r.notes.trim(),
        }))
        .filter((r) => Boolean(r.serialNumber));

      if (validSerials.length === 0) {
        setErrorMsg('Please enter at least one valid serial number');
        return;
      }

      // Duplicate check within batch
      const snSet = new Set<string>();
      for (const s of validSerials) {
        if (snSet.has(s.serialNumber)) {
          setErrorMsg(`Duplicate serial number in entry: ${s.serialNumber}`);
          return;
        }
        snSet.add(s.serialNumber);
      }

      // Check if item already in staged items list
      const existingIdx = stagedItems.findIndex((si) => si.itemId === selectedActiveItem.id);
      if (existingIdx >= 0) {
        const existing = stagedItems[existingIdx];
        const existingSns = existing.serialRows?.map((sr) => sr.serialNumber) || [];
        for (const s of validSerials) {
          if (existingSns.includes(s.serialNumber)) {
            setErrorMsg(`Serial number "${s.serialNumber}" is already added to this receipt.`);
            return;
          }
        }
        const updatedRows = [...(existing.serialRows || []), ...validSerials];
        const updated = [...stagedItems];
        updated[existingIdx] = {
          ...existing,
          quantity: updatedRows.length,
          serialRows: updatedRows,
        };
        setStagedItems(updated);
      } else {
        setStagedItems((prev) => [
          ...prev,
          {
            itemId: selectedActiveItem.id,
            itemName: selectedActiveItem.name,
            brand: selectedActiveItem.brand || null,
            modelNumber: selectedActiveItem.modelNumber || null,
            trackingType: 'SERIALIZED',
            unitSymbol: selectedActiveItem.unit?.symbol || 'pcs',
            quantity: validSerials.length,
            serialRows: validSerials,
          },
        ]);
      }
    } else {
      // Bulk item
      if (activeQuantity <= 0) {
        setErrorMsg('Quantity must be greater than 0');
        return;
      }

      const existingIdx = stagedItems.findIndex((si) => si.itemId === selectedActiveItem.id);
      if (existingIdx >= 0) {
        const existing = stagedItems[existingIdx];
        const updated = [...stagedItems];
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity + activeQuantity,
        };
        setStagedItems(updated);
      } else {
        setStagedItems((prev) => [
          ...prev,
          {
            itemId: selectedActiveItem.id,
            itemName: selectedActiveItem.name,
            brand: selectedActiveItem.brand || null,
            modelNumber: selectedActiveItem.modelNumber || null,
            trackingType: 'BULK',
            unitSymbol: selectedActiveItem.unit?.symbol || 'pcs',
            quantity: activeQuantity,
          },
        ]);
      }
    }

    // Reset active item inputs
    setActiveItemId('');
    setActiveQuantity(1);
    setActiveSerialRows([{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }]);
    setErrorMsg(null);
  };

  const handleRemoveStagedItem = (index: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSerialField = () => {
    setActiveSerialRows((prev) => [
      ...prev,
      { serialNumber: '', conditionLabel: 'Standby Good', notes: '' },
    ]);
  };

  const handleRemoveSerialField = (idx: number) => {
    setActiveSerialRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSerialChange = (idx: number, field: keyof SerialItemEntry, value: string) => {
    const updated = [...activeSerialRows];
    updated[idx] = { ...updated[idx], [field]: value };
    setActiveSerialRows(updated);
  };

  const handleSetAllRegularConditions = (condition: string) => {
    setActiveSerialRows((prev) => prev.map((r) => ({ ...r, conditionLabel: condition })));
  };

  const handleApplyPasteSerials = () => {
    setPasteError(null);
    if (!pasteText.trim()) return;

    const rawList = pasteText
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawList.length === 0) return;

    const seen = new Set<string>();
    const duplicates: string[] = [];
    const newRows: SerialItemEntry[] = [];

    rawList.forEach((sn) => {
      if (seen.has(sn)) {
        duplicates.push(sn);
      } else {
        seen.add(sn);
        newRows.push({
          serialNumber: sn,
          conditionLabel: pasteCondition,
          notes: '',
        });
      }
    });

    if (duplicates.length > 0) {
      setPasteError(`Duplicate serial numbers found in paste: ${duplicates.join(', ')}`);
      return;
    }

    setActiveSerialRows(newRows);
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

  const handleSelectAllSerials = () => {
    const updated: any = { ...selectedSerialReturns };
    const filteredSns = projectInventory
      .filter((i) => i.trackingType === 'SERIALIZED' && i.serialNumber)
      .map((i) => i.serialNumber!);

    filteredSns.forEach((sn) => {
      if (updated[sn]) {
        updated[sn] = { ...updated[sn], selected: true };
      }
    });
    setSelectedSerialReturns(updated);
  };

  const handleDeselectAllSerials = () => {
    const updated: any = { ...selectedSerialReturns };
    Object.keys(updated).forEach((sn) => {
      updated[sn] = { ...updated[sn], selected: false };
    });
    setSelectedSerialReturns(updated);
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
  const handleSaveInternal = async () => {
    setErrorMsg(null);
    setIsSaving(true);

    try {
      if (sourceType === 'REGULAR') {
        if (!regularForm.warehouseId) {
          throw new Error('Please select a Destination Warehouse');
        }

        let itemsToSubmit = [...stagedItems];

        // If user filled active item fields without clicking "Add Item", include it
        if (activeItemId && selectedActiveItem) {
          if (isActiveItemSerialized) {
            const valid = activeSerialRows
              .map((r) => ({
                serialNumber: r.serialNumber.trim(),
                conditionLabel: r.conditionLabel,
                notes: r.notes.trim(),
              }))
              .filter((r) => Boolean(r.serialNumber));
            if (valid.length > 0) {
              itemsToSubmit.push({
                itemId: selectedActiveItem.id,
                itemName: selectedActiveItem.name,
                brand: selectedActiveItem.brand || null,
                modelNumber: selectedActiveItem.modelNumber || null,
                trackingType: 'SERIALIZED',
                unitSymbol: selectedActiveItem.unit?.symbol || 'pcs',
                quantity: valid.length,
                serialRows: valid,
              });
            }
          } else if (activeQuantity > 0) {
            itemsToSubmit.push({
              itemId: selectedActiveItem.id,
              itemName: selectedActiveItem.name,
              brand: selectedActiveItem.brand || null,
              modelNumber: selectedActiveItem.modelNumber || null,
              trackingType: 'BULK',
              unitSymbol: selectedActiveItem.unit?.symbol || 'pcs',
              quantity: activeQuantity,
            });
          }
        }

        if (itemsToSubmit.length === 0) {
          throw new Error('Please add at least one item to the incoming receipt');
        }

        const itemsPayload = itemsToSubmit.map((si) => ({
          itemId: si.itemId,
          quantity: si.quantity,
          serialDetails: si.trackingType === 'SERIALIZED'
            ? si.serialRows?.map((sr) => ({
                serialNumber: sr.serialNumber,
                conditionLabel: sr.conditionLabel,
                notes: sr.notes || undefined,
              }))
            : undefined,
        }));

        await apiClient.post('/stock-movements/incoming', {
          movementType: 'INCOMING',
          movementDate: regularForm.movementDate,
          destinationWarehouseId: Number(regularForm.warehouseId),
          referenceNumber: regularForm.referenceNumber.trim() || undefined,
          notes: regularForm.notes.trim() || undefined,
          items: itemsPayload,
        });

        onSuccess();
        onClose();
      } else {
        // RETURN
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

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record stock movement');
    } finally {
      setIsSaving(false);
    }
  };

  const totalStagedBulk = stagedItems.reduce((acc, i) => acc + (i.trackingType === 'BULK' ? i.quantity : 0), 0);
  const totalStagedSerials = stagedItems.reduce((acc, i) => acc + (i.trackingType === 'SERIALIZED' ? i.quantity : 0), 0);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Record Incoming Stock Movement"
        maxWidth="840px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveInternal();
          }}
        >
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
                {errorMsg}
              </div>
            )}

            {/* 1. Incoming Source Selection via SegmentedControl */}
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
              <SegmentedControl<'REGULAR' | 'RETURN'>
                value={sourceType}
                onChange={(val) => setSourceType(val)}
                options={[
                  {
                    value: 'REGULAR',
                    label: 'External / Supplier Incoming',
                    icon: <PackageCheck size={16} />,
                  },
                  {
                    value: 'RETURN',
                    label: 'Project Return / Recheck',
                    icon: <RotateCcw size={16} />,
                  },
                ]}
              />
            </div>

            {/* A. REGULAR INCOMING FORM */}
            {sourceType === 'REGULAR' && (
              <div>
                {/* Header Information */}
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Destination Warehouse *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Search destination warehouse..."
                      searchPlaceholder="Type warehouse name or city code..."
                      value={regularForm.warehouseId}
                      onChange={(val) => setRegularForm({ ...regularForm, warehouseId: val })}
                      options={warehouses.map((w) => ({
                        value: w.id,
                        label: w.name,
                        badge: w.cityCode || undefined,
                      }))}
                    />
                  </FormField>

                  <FormField label="Movement Date *" required style={{ marginBottom: 0 }}>
                    <Input
                      type="date"
                      required
                      value={regularForm.movementDate}
                      onChange={(e) => setRegularForm({ ...regularForm, movementDate: e.target.value })}
                    />
                  </FormField>
                </div>

                {/* Staged Items List / Receipt Lines */}
                {stagedItems.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1E293B' }}>
                        Receipt Items ({stagedItems.length} line(s) &bull; {totalStagedBulk > 0 ? `${totalStagedBulk} bulk` : ''} {totalStagedSerials > 0 ? `${totalStagedSerials} serials` : ''})
                      </span>
                    </div>

                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                            <th style={{ padding: '6px 10px' }}>Item</th>
                            <th style={{ padding: '6px 10px' }}>Type</th>
                            <th style={{ padding: '6px 10px' }}>Quantity / Serials</th>
                            <th style={{ padding: '6px 10px', width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stagedItems.map((si, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '6px 10px' }}>
                                <div style={{ fontWeight: 600, color: '#1E293B' }}>{si.itemName}</div>
                                <div style={{ fontSize: '0.725rem', color: '#64748B' }}>
                                  {[si.brand, si.modelNumber].filter(Boolean).join(' - ') || 'Generic'}
                                </div>
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, backgroundColor: si.trackingType === 'SERIALIZED' ? '#F3E8FF' : '#E0F2FE', color: si.trackingType === 'SERIALIZED' ? '#7E22CE' : '#0369A1' }}>
                                  {si.trackingType}
                                </span>
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <div style={{ fontWeight: 700, color: '#0F766E' }}>
                                  {si.quantity} {si.unitSymbol}
                                </div>
                                {si.trackingType === 'SERIALIZED' && si.serialRows && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                                    {si.serialRows.map((sr, sIdx) => (
                                      <span key={sIdx} style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1' }}>
                                        {sr.serialNumber} <span style={{ color: sr.conditionLabel === 'Standby Good' ? '#059669' : '#DC2626' }}>({sr.conditionLabel})</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStagedItem(idx)}
                                  style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                                  title="Remove item line"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Add Item Form Box */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      {stagedItems.length > 0 ? '+ Add Another Item to Receipt' : 'Add Item to Receipt'}
                    </span>
                  </div>

                  <div className="form-grid" style={{ marginBottom: '8px' }}>
                    <FormField label="Item Master *" style={{ marginBottom: 0 }}>
                      <SearchableSelect
                        placeholder="Search item to receive..."
                        searchPlaceholder="Type name, brand, or model..."
                        value={activeItemId}
                        onChange={(val) => {
                          setActiveItemId(val);
                          const it = items.find((i) => String(i.id) === val);
                          if (it?.trackingType === 'SERIALIZED') {
                            setActiveSerialRows([{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }]);
                          }
                        }}
                        options={items.map((i) => ({
                          value: i.id,
                          label: i.name,
                          badge: i.trackingType,
                          sublabel: i.brand ? (i.modelNumber ? `${i.brand} [MN: ${i.modelNumber}]` : i.brand) : (i.modelNumber ? `MN: ${i.modelNumber}` : undefined),
                        }))}
                      />
                    </FormField>

                    {!isActiveItemSerialized ? (
                      <FormField label="Quantity *" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                          <QuantityStepper
                            min={1}
                            value={activeQuantity}
                            onChange={(val) => setActiveQuantity(val || 1)}
                            unitSymbol={selectedActiveItem?.unit?.symbol || 'pcs'}
                          />
                        </div>
                      </FormField>
                    ) : (
                      <FormField label="Serial Units Count" style={{ marginBottom: 0 }}>
                        <div style={{ paddingTop: '8px', fontWeight: 600, color: '#2250A1' }}>
                          {activeSerialRows.length} Serial Unit(s)
                        </div>
                      </FormField>
                    )}
                  </div>

                  {/* Serial Entry Rows if active item is SERIALIZED */}
                  {isActiveItemSerialized && (
                    <div style={{ border: '1px solid #CBD5E1', borderRadius: '6px', padding: '10px', backgroundColor: '#FFFFFF', marginTop: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#1E293B' }}>
                          Serial Numbers &amp; Condition Configuration
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Set all:</span>
                          <button
                            type="button"
                            onClick={() => handleSetAllRegularConditions('Standby Good')}
                            style={{ padding: '1px 5px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '3px', border: '1px solid #A7F3D0', backgroundColor: '#ECFDF5', color: '#059669', cursor: 'pointer' }}
                          >
                            Good
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllRegularConditions('Standby Bad')}
                            style={{ padding: '1px 5px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '3px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                          >
                            Bad
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllRegularConditions('Under Repair')}
                            style={{ padding: '1px 5px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '3px', border: '1px solid #FDE68A', backgroundColor: '#FFFBEB', color: '#D97706', cursor: 'pointer' }}
                          >
                            Repair
                          </button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setPasteModalOpen(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            <ClipboardList size={13} /> Batch Paste
                          </Button>
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeSerialRows.map((row, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <Input
                                placeholder={`Serial #${idx + 1}`}
                                value={row.serialNumber}
                                onChange={(e) => handleSerialChange(idx, 'serialNumber', e.target.value)}
                                style={{ flex: 2, padding: '4px 8px', fontSize: '0.8rem' }}
                              />
                              <Select
                                value={row.conditionLabel}
                                onChange={(e) => handleSerialChange(idx, 'conditionLabel', e.target.value)}
                                style={{ flex: 1.5, padding: '4px 8px', fontSize: '0.8rem' }}
                              >
                                <option value="Standby Good">Standby Good</option>
                                <option value="Standby Bad">Standby Bad</option>
                                <option value="Under Repair">Under Repair</option>
                              </Select>
                              <Input
                                placeholder="Notes (optional)"
                                value={row.notes}
                                onChange={(e) => handleSerialChange(idx, 'notes', e.target.value)}
                                style={{ flex: 2, padding: '4px 8px', fontSize: '0.8rem' }}
                              />
                              {activeSerialRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSerialField(idx)}
                                  style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddSerialField}
                        style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 6px' }}
                      >
                        <Plus size={13} /> Add Row
                      </Button>
                    </div>
                  )}

                  {activeItemId && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddActiveItemToStaged}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Add Line to Receipt
                      </Button>
                    </div>
                  )}
                </div>

                <div className="form-grid">
                  <FormField label="Reference (PO / Contract / Waybill)">
                    <Input
                      placeholder="e.g. PO-2026-001, WB-9988..."
                      value={regularForm.referenceNumber}
                      onChange={(e) => setRegularForm({ ...regularForm, referenceNumber: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Notes / Purpose">
                    <Input
                      placeholder="e.g. Stock replenishment, new procurement..."
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
                  <FormField label="Source Project *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Select Project returning assets..."
                      searchPlaceholder="Type project name..."
                      value={returnForm.projectId}
                      onChange={(val) => setReturnForm({ ...returnForm, projectId: val })}
                      options={projects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        badge: p.siteCode || undefined,
                        sublabel: p.client?.name ? `Client: ${p.client.name}` : undefined,
                      }))}
                    />
                  </FormField>

                  <FormField label="Destination Warehouse *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Select Warehouse to receive returned items..."
                      searchPlaceholder="Type warehouse name or city code..."
                      value={returnForm.warehouseId}
                      onChange={(val) => setReturnForm({ ...returnForm, warehouseId: val })}
                      options={warehouses.map((w) => ({
                        value: w.id,
                        label: w.name,
                        badge: w.cityCode || undefined,
                      }))}
                    />
                  </FormField>
                </div>

                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Movement Date *" required style={{ marginBottom: 0 }}>
                    <Input
                      type="date"
                      required
                      value={returnForm.movementDate}
                      onChange={(e) => setReturnForm({ ...returnForm, movementDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Reference Number" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="e.g. RET-PHM-001..."
                      value={returnForm.referenceNumber}
                      onChange={(e) => setReturnForm({ ...returnForm, referenceNumber: e.target.value })}
                    />
                  </FormField>
                </div>

                {/* Project Assets Picker */}
                {returnForm.projectId && (
                  <div style={{ marginTop: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                        Project Inventory to Return
                      </h4>
                      <Input
                        placeholder="Search serial number or item..."
                        value={snSearch}
                        onChange={(e) => setSnSearch(e.target.value)}
                        style={{ width: '220px', padding: '4px 8px', fontSize: '0.75rem' }}
                      />
                    </div>

                    {isLoadingInventory ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                        Loading project inventory...
                      </div>
                    ) : projectInventory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                        No inventory currently deployed at this project site.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Bulk Return Items */}
                        {projectInventory.filter((i) => i.trackingType === 'BULK').length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                              Bulk Materials
                            </div>
                            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                                    <th style={{ padding: '6px 10px' }}>Item</th>
                                    <th style={{ padding: '6px 10px' }}>At Project</th>
                                    <th style={{ padding: '6px 10px', width: '140px' }}>Return Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {projectInventory
                                    .filter((i) => i.trackingType === 'BULK')
                                    .map((bItem) => {
                                      const currentReturnQty = selectedBulkReturns[bItem.itemId] || 0;
                                      return (
                                        <tr key={bItem.itemId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                          <td style={{ padding: '6px 10px' }}>
                                            <div style={{ fontWeight: 600 }}>{bItem.itemName}</div>
                                            <div style={{ fontSize: '0.725rem', color: '#64748B' }}>
                                              {[bItem.brand, bItem.modelNumber].filter(Boolean).join(' - ')}
                                            </div>
                                          </td>
                                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                                            {bItem.availableQty} {bItem.unitSymbol}
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <QuantityStepper
                                              min={0}
                                              max={bItem.availableQty}
                                              value={currentReturnQty}
                                              onChange={(val) => handleBulkReturnQtyChange(bItem.itemId, val, bItem.availableQty)}
                                              unitSymbol={bItem.unitSymbol}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Serialized Return Items */}
                        {projectInventory.filter((i) => i.trackingType === 'SERIALIZED').length > 0 && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                Serialized Assets
                              </span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={handleSelectAllSerials}
                                  style={{ border: 'none', background: 'none', color: '#2250A1', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Select All
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeselectAllSerials}
                                  style={{ border: 'none', background: 'none', color: '#64748B', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Deselect All
                                </button>
                              </div>
                            </div>

                            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#FFFFFF', maxHeight: '240px', overflowY: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                                    <th style={{ padding: '6px 10px', width: '30px' }}></th>
                                    <th style={{ padding: '6px 10px' }}>Serial Number</th>
                                    <th style={{ padding: '6px 10px' }}>Item</th>
                                    <th style={{ padding: '6px 10px', width: '150px' }}>Returned Condition</th>
                                    <th style={{ padding: '6px 10px' }}>Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {projectInventory
                                    .filter((i) => i.trackingType === 'SERIALIZED')
                                    .filter((i) =>
                                      snSearch
                                        ? i.serialNumber?.toLowerCase().includes(snSearch.toLowerCase()) ||
                                          i.itemName.toLowerCase().includes(snSearch.toLowerCase())
                                        : true,
                                    )
                                    .map((sItem) => {
                                      const sn = sItem.serialNumber!;
                                      const isSelected = selectedSerialReturns[sn]?.selected || false;
                                      const cond = selectedSerialReturns[sn]?.conditionLabel || 'Standby Good';
                                      const notes = selectedSerialReturns[sn]?.notes || '';

                                      return (
                                        <tr key={sn} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isSelected ? '#EFF6FF' : undefined }}>
                                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => handleSerialSelectToggle(sn)}
                                              style={{ cursor: 'pointer' }}
                                            />
                                          </td>
                                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                                            {sn}
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <div>{sItem.itemName}</div>
                                            <div style={{ fontSize: '0.725rem', color: '#64748B' }}>
                                              {[sItem.brand, sItem.modelNumber].filter(Boolean).join(' - ')}
                                            </div>
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <Select
                                              value={cond}
                                              disabled={!isSelected}
                                              onChange={(e) => handleSerialReturnConditionChange(sn, e.target.value)}
                                              style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                                            >
                                              <option value="Standby Good">Standby Good</option>
                                              <option value="Standby Bad">Standby Bad</option>
                                              <option value="Under Repair">Under Repair</option>
                                            </Select>
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <Input
                                              placeholder="Condition note"
                                              disabled={!isSelected}
                                              value={notes}
                                              onChange={(e) => handleSerialReturnNotesChange(sn, e.target.value)}
                                              style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Recording Movement...' : 'Confirm Incoming Receipt'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Paste Serials Modal */}
      <Modal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        title="Batch Paste Serial Numbers"
        maxWidth="500px"
      >
        <div className="modal-body">
          {pasteError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{pasteError}</div>}
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 0 }}>
            Paste multiple serial numbers separated by newlines or commas.
          </p>

          <FormField label="Serial Numbers *">
            <Textarea
              rows={6}
              placeholder="SN001&#10;SN002&#10;SN003"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              style={{ fontFamily: 'monospace' }}
            />
          </FormField>

          <FormField label="Default Initial Condition">
            <Select
              value={pasteCondition}
              onChange={(e) => setPasteCondition(e.target.value)}
            >
              <option value="Standby Good">Standby Good</option>
              <option value="Standby Bad">Standby Bad</option>
              <option value="Under Repair">Under Repair</option>
            </Select>
          </FormField>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button type="button" variant="secondary" onClick={() => setPasteModalOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleApplyPasteSerials}>
            Apply Serials
          </Button>
        </div>
      </Modal>
    </>
  );
};

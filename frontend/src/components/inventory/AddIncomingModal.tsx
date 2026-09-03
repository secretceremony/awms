import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  SegmentedControl,
  ConfirmModal,
  QuantityStepper,
  SearchableSelect,
} from '../ui/index.js';
import { Plus, Trash2, ClipboardList, RotateCcw, PackageCheck, CheckSquare, Square}  from 'lucide-react';
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
  const [snSearch, setSnSearch] = useState('');
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Return selection state
  const [selectedBulkReturns, setSelectedBulkReturns] = useState<{ [itemId: number]: number }>({});
  const [selectedSerialReturns, setSelectedSerialReturns] = useState<{
    [sn: string]: { selected: boolean; conditionLabel: string; notes: string };
  }>({});

  const [initialRegular, setInitialRegular] = useState(regularForm);
  const [initialReturn, setInitialReturn] = useState(returnForm);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Multi-paste modal for regular incoming
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteCondition, setPasteCondition] = useState<string>('Standby Good');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const itemSelectRef = useRef<HTMLSelectElement>(null);
  const whSelectRef = useRef<HTMLSelectElement>(null);

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
      const rInit = {
        movementDate: new Date().toISOString().split('T')[0],
        warehouseId: '',
        itemId: '',
        quantity: 1,
        serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
        referenceNumber: '',
        notes: '',
      };
      setRegularForm(rInit);
      setInitialRegular(rInit);

      const retInit = {
        movementDate: new Date().toISOString().split('T')[0],
        projectId: '',
        warehouseId: '',
        referenceNumber: '',
        notes: '',
      };
      setReturnForm(retInit);
      setInitialReturn(retInit);
      setProjectInventory([]);
      setSelectedBulkReturns({});
      setSelectedSerialReturns({});
      setPasteModalOpen(false);
      setPasteText('');
      setPasteCondition('Standby Good');
      setPasteError(null);
      setErrorMsg(null);

      setTimeout(() => {
        whSelectRef.current?.focus();
      }, 50);
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

        // Reset return selections; preserve current condition per SN by default
        setSelectedBulkReturns({});
        const snInitial: any = {};
        invList
          .filter((i) => i.trackingType === 'SERIALIZED' && i.serialNumber)
          .forEach((s) => {
            snInitial[s.serialNumber!] = {
              selected: false,
              // Rule 14: Default condition preserves each SN's existing/current condition
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

  const selectedRegularItem = items.find((i) => String(i.id) === regularForm.itemId);
  const isRegularSerialized = selectedRegularItem?.trackingType === 'SERIALIZED';

  const isDirty =
    sourceType === 'REGULAR'
      ? JSON.stringify(regularForm) !== JSON.stringify(initialRegular)
      : JSON.stringify(returnForm) !== JSON.stringify(initialReturn) ||
        Object.keys(selectedBulkReturns).length > 0 ||
        Object.values(selectedSerialReturns).some((s) => s.selected);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // --- Regular Incoming Handlers ---
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

  const handleSetAllRegularConditions = (condition: string) => {
    setRegularForm((prev) => ({
      ...prev,
      serialRows: prev.serialRows.map((r) => ({ ...r, conditionLabel: condition })),
    }));
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
          conditionLabel: pasteCondition || 'Standby Good',
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
  const handleSaveInternal = async (addAnother: boolean) => {
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
          const serials = regularForm.serialRows
            .map((r) => ({
              serialNumber: r.serialNumber.trim(),
              conditionLabel: r.conditionLabel,
              notes: r.notes.trim() || undefined,
            }))
            .filter((s) => Boolean(s.serialNumber));

          if (serials.length === 0) {
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

        onSuccess();

        if (addAnother) {
          // Rule 13: KEEP Source = External Incoming, Date, Destination Warehouse; RESET Item, Qty/SN, Reference, Notes
          setRegularForm((prev) => ({
            ...prev,
            itemId: '',
            quantity: 1,
            serialRows: [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }],
            referenceNumber: '',
            notes: '',
          }));
          setTimeout(() => {
            itemSelectRef.current?.focus();
          }, 50);
        } else {
          onClose();
        }
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

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to record incoming movement');
    } finally {
      setIsSaving(false);
    }
  };

  const bulkProjectItems = projectInventory.filter((i) => i.trackingType === 'BULK');
  const serializedProjectItems = projectInventory.filter(
    (i) =>
      i.trackingType === 'SERIALIZED' &&
      (!snSearch.trim() ||
        i.serialNumber?.toLowerCase().includes(snSearch.toLowerCase()) ||
        i.itemName.toLowerCase().includes(snSearch.toLowerCase())),
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={sourceType === 'REGULAR' ? 'Record Incoming Stock' : 'Record Project Return / Recheck'}
        maxWidth="820px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveInternal(false);
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
                    label: 'External / Regular Incoming',
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

                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Item Master *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Search item master..."
                      searchPlaceholder="Type item name, brand, or model number..."
                      value={regularForm.itemId}
                      onChange={(val) => {
                        const it = items.find((i) => String(i.id) === val);
                        setRegularForm({
                          ...regularForm,
                          itemId: val,
                          serialRows:
                            it?.trackingType === 'SERIALIZED'
                              ? [{ serialNumber: '', conditionLabel: 'Standby Good', notes: '' }]
                              : [],
                        });
                      }}
                      options={items.map((i) => ({
                        value: i.id,
                        label: i.name,
                        badge: i.trackingType,
                        sublabel: i.brand ? (i.modelNumber ? `${i.brand} [MN: ${i.modelNumber}]` : i.brand) : (i.modelNumber ? `MN: ${i.modelNumber}` : undefined),
                      }))}
                    />
                  </FormField>

                  {!isRegularSerialized ? (
                    <FormField label="Quantity *" required style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                        <QuantityStepper
                          min={1}
                          value={regularForm.quantity}
                          onChange={(val) => setRegularForm({ ...regularForm, quantity: val || 1 })}
                          unitSymbol={selectedRegularItem?.unit?.symbol || 'pcs'}
                        />
                      </div>
                    </FormField>
                  ) : (
                    <FormField label="Serial Count" style={{ marginBottom: 0 }}>
                      <div style={{ paddingTop: '8px', fontWeight: 600, color: '#2250A1' }}>
                        {regularForm.serialRows.length} Serial Unit(s)
                      </div>
                    </FormField>
                  )}
                </div>

                {/* Serialized Asset Configuration */}
                {isRegularSerialized && (
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#F8FAFC',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
                        Serial Numbers &amp; Conditions ({regularForm.serialRows.length})
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Set all:</span>
                        <button
                          type="button"
                          onClick={() => handleSetAllRegularConditions('Standby Good')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '3px',
                            border: '1px solid #A7F3D0',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            cursor: 'pointer',
                          }}
                        >
                          Good
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllRegularConditions('Standby Bad')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '3px',
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            cursor: 'pointer',
                          }}
                        >
                          Bad
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllRegularConditions('Under Repair')}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '3px',
                            border: '1px solid #FDE68A',
                            backgroundColor: '#FFFBEB',
                            color: '#D97706',
                            cursor: 'pointer',
                          }}
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {regularForm.serialRows.map((row, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Input
                            placeholder={`Serial #${idx + 1}`}
                            required
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
                          {regularForm.serialRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSerialField(idx)}
                              style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={15} />
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
                      style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 6px' }}
                    >
                      <Plus size={13} /> Add Row
                    </Button>
                  </div>
                )}

                <div className="form-grid">
                  <FormField label="Reference (PO / Contract / Waybill)">
                    <Input
                      placeholder="e.g. PO-2026-001, WB-9988..."
                      value={regularForm.referenceNumber}
                      onChange={(e) => setRegularForm({ ...regularForm, referenceNumber: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Notes / Remarks">
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
                  <FormField label="Source Project *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Search source project..."
                      searchPlaceholder="Type project name, site code, or client..."
                      value={returnForm.projectId}
                      onChange={(val) => setReturnForm({ ...returnForm, projectId: val })}
                      options={projects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        badge: p.siteCode ? `Site: ${p.siteCode}` : undefined,
                        sublabel: p.client?.name ? `Client: ${p.client.name}` : undefined,
                      }))}
                    />
                  </FormField>

                  <FormField label="Destination Warehouse *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Search destination warehouse..."
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
                  <FormField label="Movement Date" required style={{ marginBottom: 0 }}>
                    <Input
                      type="date"
                      required
                      value={returnForm.movementDate}
                      onChange={(e) => setReturnForm({ ...returnForm, movementDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="DO / Return Reference" style={{ marginBottom: 0 }}>
                    <Input
                      placeholder="e.g. DO-PHM-2026-001, RET-09..."
                      value={returnForm.referenceNumber}
                      onChange={(e) => setReturnForm({ ...returnForm, referenceNumber: e.target.value })}
                    />
                  </FormField>
                </div>

                {/* Project Inventory Section */}
                <div style={{ marginBottom: '1rem' }}>
                  {!returnForm.projectId ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '6px', color: '#6B7280', fontSize: '0.85rem' }}>
                      Select a Source Project above to view its deployed inventory.
                    </div>
                  ) : isLoadingInventory ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6B7280', fontSize: '0.85rem' }}>
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
                        <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ padding: '6px 12px', backgroundColor: '#F8FAFC', fontWeight: 600, fontSize: '0.8rem', color: '#334155' }}>
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
                                    <div style={{ fontWeight: 600, color: '#1E293B' }}>{b.itemName}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                      {b.brand && `${b.brand} `} {b.modelNumber && `| MN: ${b.modelNumber}`}
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {b.availableQty} {b.unitSymbol}
                                  </td>
                                  <td>
                                    <QuantityStepper
                                      min={0}
                                      max={b.availableQty}
                                      value={selectedBulkReturns[b.itemId] || 0}
                                      onChange={(val) => handleBulkReturnQtyChange(b.itemId, val, b.availableQty)}
                                      size="sm"
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
                        <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                          <div
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#F8FAFC',
                              borderBottom: '1px solid #E2E8F0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#334155' }}>
                              Serialized Assets ({serializedProjectItems.length} units deployed)
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Input
                                placeholder="Filter SN..."
                                value={snSearch}
                                onChange={(e) => setSnSearch(e.target.value)}
                                style={{ width: '130px', padding: '2px 6px', fontSize: '0.75rem' }}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleSelectAllSerials}
                                style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <CheckSquare size={12} /> Select All
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDeselectAllSerials}
                                style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Square size={12} /> Deselect All
                              </Button>
                            </div>
                          </div>

                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ position: 'sticky', top: 0, backgroundColor: '#F1F5F9', zIndex: 1 }}>
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
                                    conditionLabel: s.condition || 'Standby Good',
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
                                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{s.itemName}</div>
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

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {sourceType === 'REGULAR' && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleSaveInternal(true)}
                  isLoading={isSaving}
                >
                  Save &amp; Add Another
                </Button>
              )}
              <Button variant="primary" type="submit" isLoading={isSaving}>
                {sourceType === 'REGULAR' ? 'Record Incoming' : 'Record Project Return'}
              </Button>
            </div>
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
          <FormField label="Condition for Pasted Units" required>
            <Select
              value={pasteCondition}
              onChange={(e) => setPasteCondition(e.target.value)}
            >
              <option value="Standby Good">Standby Good (Ready for deployment)</option>
              <option value="Standby Bad">Standby Bad (Defective / Damaged)</option>
              <option value="Under Repair">Under Repair (Needs maintenance)</option>
            </Select>
          </FormField>

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

export default AddIncomingModal;

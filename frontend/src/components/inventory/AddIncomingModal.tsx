import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  SegmentedControl,
} from '../ui/index.js';
import { RotateCcw, PackageCheck } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { BatchPasteSerialsModal } from './incoming/BatchPasteSerialsModal.js';
import { RegularIncomingSection } from './incoming/RegularIncomingSection.js';
import { ProjectReturnSection } from './incoming/ProjectReturnSection.js';

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
              <RegularIncomingSection
                warehouses={warehouses}
                items={items}
                regularForm={regularForm}
                stagedItems={stagedItems}
                activeItemId={activeItemId}
                activeQuantity={activeQuantity}
                activeSerialRows={activeSerialRows}
                onFormChange={(field, val) => setRegularForm((prev) => ({ ...prev, [field]: val }))}
                onActiveItemIdChange={setActiveItemId}
                onActiveQuantityChange={setActiveQuantity}
                onActiveSerialRowsChange={setActiveSerialRows}
                onAddActiveItemToStaged={handleAddActiveItemToStaged}
                onRemoveStagedItem={handleRemoveStagedItem}
                onOpenPasteModal={() => setPasteModalOpen(true)}
              />
            )}

            {/* B. PROJECT RETURN / RECHECK FORM */}
            {sourceType === 'RETURN' && (
              <ProjectReturnSection
                projects={projects}
                warehouses={warehouses}
                returnForm={returnForm}
                projectInventory={projectInventory}
                isLoadingInventory={isLoadingInventory}
                snSearch={snSearch}
                selectedBulkReturns={selectedBulkReturns}
                selectedSerialReturns={selectedSerialReturns}
                onFormChange={(field, val) => setReturnForm((prev) => ({ ...prev, [field]: val }))}
                onSnSearchChange={setSnSearch}
                onBulkReturnQtyChange={handleBulkReturnQtyChange}
                onSerialSelectToggle={handleSerialSelectToggle}
                onSelectAllSerials={handleSelectAllSerials}
                onDeselectAllSerials={handleDeselectAllSerials}
                onSerialConditionChange={handleSerialReturnConditionChange}
                onSerialNotesChange={handleSerialReturnNotesChange}
              />
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
      <BatchPasteSerialsModal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        onApplySerials={(newRows) => setActiveSerialRows(newRows)}
      />
    </>
  );
};

import React, { useState, useEffect } from 'react';
import {
  StepWizardModal,
  FormField,
  Input,
  Textarea,
  QuantityStepper,
  SearchableSelect,
} from '../ui/index.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Trash2 } from 'lucide-react';
import { ProjectSnapshotCard } from '../common/ProjectSnapshotCard.js';
import { InventoryPicker, type InventoryItemOption } from '../common/InventoryPicker.js';

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

const WIZARD_STEPS = [
  { id: 1, label: 'Destination & Purpose' },
  { id: 2, label: 'Select Inventory Items' },
];

export const AddOutgoingModal: React.FC<AddOutgoingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [ptsNumber, setPtsNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2 State
  const [selectedItems, setSelectedItems] = useState<SelectedOutgoingItem[]>([]);
  const [establishedWarehouseId, setEstablishedWarehouseId] = useState<number | null>(null);

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
      setStep(1);
      setSelectedProjectId('');
      setMovementDate(new Date().toISOString().split('T')[0]);
      setPtsNumber('');
      setNotes('');
      setSelectedItems([]);
      setEstablishedWarehouseId(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const selectedProject = projects.find((p) => String(p.id) === selectedProjectId);

  const isDirty =
    Boolean(selectedProjectId) ||
    Boolean(notes) ||
    Boolean(ptsNumber) ||
    selectedItems.length > 0;

  const handleStep1Continue = () => {
    if (!selectedProjectId) {
      setErrorMsg('Please select a Destination Project');
      return false;
    }
    if (!notes.trim()) {
      setErrorMsg('Purpose is mandatory for outgoing stock dispatch');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleAddInventoryItem = (item: InventoryItemOption) => {
    // Single warehouse rule
    if (establishedWarehouseId === null) {
      setEstablishedWarehouseId(item.warehouseId);
    } else if (establishedWarehouseId !== item.warehouseId) {
      setErrorMsg(
        `All items in an outgoing movement must originate from the same warehouse. Currently locked to Hub #${establishedWarehouseId}.`,
      );
      return;
    }

    if (item.trackingType === 'BULK') {
      const existingIdx = selectedItems.findIndex(
        (si) => si.itemId === item.itemId && si.warehouseId === item.warehouseId,
      );
      if (existingIdx >= 0) {
        // Increment quantity up to available
        const current = selectedItems[existingIdx];
        if (current.quantity < current.maxAvailableQty) {
          const updated = [...selectedItems];
          updated[existingIdx] = { ...current, quantity: current.quantity + 1 };
          setSelectedItems(updated);
        }
      } else {
        setSelectedItems((prev) => [
          ...prev,
          {
            itemId: item.itemId,
            itemName: item.itemName,
            brand: item.brand,
            modelNumber: item.modelNumber,
            trackingType: 'BULK',
            warehouseId: item.warehouseId,
            warehouseName: item.warehouseName,
            cityCode: item.cityCode,
            quantity: 1,
            unitSymbol: item.unitSymbol,
            maxAvailableQty: item.availableQty,
          },
        ]);
      }
    } else {
      // Serialized item
      const sn = item.serialNumber!;
      const existingIdx = selectedItems.findIndex(
        (si) => si.itemId === item.itemId && si.warehouseId === item.warehouseId,
      );

      if (existingIdx >= 0) {
        const current = selectedItems[existingIdx];
        const currentSns = current.serialNumbers || [];
        if (!currentSns.includes(sn)) {
          const newSns = [...currentSns, sn];
          const updated = [...selectedItems];
          updated[existingIdx] = {
            ...current,
            quantity: newSns.length,
            serialNumbers: newSns,
          };
          setSelectedItems(updated);
        }
      } else {
        setSelectedItems((prev) => [
          ...prev,
          {
            itemId: item.itemId,
            itemName: item.itemName,
            brand: item.brand,
            modelNumber: item.modelNumber,
            trackingType: 'SERIALIZED',
            warehouseId: item.warehouseId,
            warehouseName: item.warehouseName,
            cityCode: item.cityCode,
            quantity: 1,
            unitSymbol: item.unitSymbol,
            serialNumbers: [sn],
            maxAvailableQty: item.availableQty,
          },
        ]);
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = selectedItems.filter((_, idx) => idx !== index);
    setSelectedItems(updated);
    if (updated.length === 0) {
      setEstablishedWarehouseId(null);
    }
  };

  const handleRemoveSerial = (itemIdx: number, sn: string) => {
    const current = selectedItems[itemIdx];
    const newSns = (current.serialNumbers || []).filter((s) => s !== sn);
    if (newSns.length === 0) {
      handleRemoveItem(itemIdx);
    } else {
      const updated = [...selectedItems];
      updated[itemIdx] = {
        ...current,
        quantity: newSns.length,
        serialNumbers: newSns,
      };
      setSelectedItems(updated);
    }
  };

  const handleBulkQtyChange = (index: number, val: number) => {
    const item = selectedItems[index];
    const boundedQty = Math.max(1, Math.min(val, item.maxAvailableQty));
    const updated = [...selectedItems];
    updated[index] = { ...item, quantity: boundedQty };
    setSelectedItems(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProjectId) {
      setErrorMsg('Destination project is required');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('Purpose is mandatory for outgoing stock dispatch');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least one item from warehouse stock');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const itemsPayload = selectedItems.map((si) => ({
        itemId: si.itemId,
        quantity: si.quantity,
        serialNumbers: si.trackingType === 'SERIALIZED' ? si.serialNumbers : undefined,
      }));

      await apiClient.post('/stock-movements/outgoing', {
        projectId: Number(selectedProjectId),
        movementDate,
        ptsNumber: ptsNumber.trim() || undefined,
        notes: notes.trim(),
        items: itemsPayload,
      });

      showToast({
        type: 'success',
        message: 'Outgoing stock movement recorded successfully',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const message = err.message || 'Failed to dispatch outgoing stock';
      setErrorMsg(message);
      showToast({
        type: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const establishedWarehouseName = selectedItems[0]
    ? `${selectedItems[0].warehouseName} [${selectedItems[0].cityCode}]`
    : null;

  return (
    <StepWizardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Outgoing Stock Dispatch"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={(s) => setStep(s as 1 | 2)}
      maxWidth="840px"
      errorMsg={errorMsg}
      isDirty={isDirty}
      isSubmitting={isSaving}
      continueLabel="Continue to Inventory"
      backLabel="Back"
      cancelLabel="Cancel"
      submitLabel="Dispatch Stock"
      onContinue={handleStep1Continue}
      onSubmit={handleSubmit}
      discardTitle="Discard Unsaved Changes?"
      discardMessage="You have unsaved changes in this outgoing dispatch form. Are you sure you want to discard them?"
      discardConfirmLabel="Discard Changes"
    >
      {/* STEP 1: DESTINATION & PURPOSE */}
      <StepWizardModal.Step step={1}>
        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <FormField label="Destination Project *" required style={{ marginBottom: 0 }}>
            <SearchableSelect
              required
              placeholder="Search destination project or site code..."
              searchPlaceholder="Type project name, site code, or client..."
              value={selectedProjectId}
              onChange={(val) => {
                setSelectedProjectId(val);
                if (errorMsg) setErrorMsg(null);
              }}
              options={projects.map((p) => ({
                value: p.id,
                label: p.name,
                badge: p.siteCode ? `Site: ${p.siteCode}` : undefined,
                sublabel: p.client?.name ? `Client: ${p.client.name}` : undefined,
              }))}
            />
          </FormField>

          <FormField label="Movement Date *" style={{ marginBottom: 0 }}>
            <Input
              type="date"
              required
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </FormField>
        </div>

        {/* Project Snapshot Card Preview */}
        {selectedProject && (
          <ProjectSnapshotCard
            clientName={selectedProject.client?.name}
            clientType={selectedProject.client?.clientType}
            attnName={selectedProject.clientContact?.name}
            attnPhone={selectedProject.clientContact?.phone}
            projectName={selectedProject.name}
            referenceNumber={selectedProject.referenceNumber}
            projectLocation={selectedProject.location}
            siteCode={selectedProject.siteCode}
          />
        )}

        <div className="form-grid" style={{ marginBottom: '1rem' }}>
          <FormField
            label="PTS Number (Project Tracking System)"
            helperText="Optional reference number for tracking against external Project Tracking System"
            style={{ marginBottom: 0 }}
          >
            <Input
              type="text"
              placeholder="e.g. PTS-2026-089"
              value={ptsNumber}
              onChange={(e) => setPtsNumber(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Purpose *" style={{ marginBottom: 0 }}>
          <Textarea
            placeholder="e.g. Field installation batch #1, Site replacement under emergency request..."
            required
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
          />
        </FormField>
      </StepWizardModal.Step>

      {/* STEP 2: INVENTORY & DISPATCH ITEMS */}
      <StepWizardModal.Step step={2}>
        {/* Persistent Situational Summary Strip */}
        {selectedProject && (
          <div className="outgoing-summary-strip">
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Project: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedProject.name}</strong>
              {selectedProject.siteCode && (
                <span style={{ color: 'var(--text-secondary)' }}> [{selectedProject.siteCode}]</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Source Hub: </span>
                <strong style={{ color: establishedWarehouseName ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                  {establishedWarehouseName || 'Unassigned (pick item)'}
                </strong>
              </div>

              <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--card-border)' }} />

              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Items: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedItems.length}</strong>
              </div>

              <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--card-border)' }} />

              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Serials: </span>
                <strong style={{ color: '#7C3AED' }}>
                  {selectedItems.filter((i) => i.trackingType === 'SERIALIZED').length}
                </strong>
              </div>

              <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--card-border)' }} />

              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Bulk: </span>
                <strong style={{ color: '#0284C7' }}>
                  {selectedItems
                    .filter((i) => i.trackingType === 'BULK')
                    .reduce((acc, curr) => acc + curr.quantity, 0)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Reusable Inventory Picker */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>
            Available Warehouse Inventory
          </label>
          <InventoryPicker
            onSelectItem={handleAddInventoryItem}
            lockedWarehouseId={establishedWarehouseId}
            lockedWarehouseName={establishedWarehouseName}
            height="200px"
          />
        </div>

        {/* Selected Dispatch Items Table */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Selected Items for Dispatch ({selectedItems.length})
          </h4>

          {selectedItems.length === 0 ? (
            <div className="outgoing-empty-card">
              No items selected yet. Search and click "+ Add" from available inventory above.
            </div>
          ) : (
            <div className="outgoing-table-container">
              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem', minWidth: '450px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--accent-secondary-bg)' }}>
                    <th>Item Description</th>
                    <th>Hub</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Qty / Serials</th>
                    <th style={{ width: '50px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((si, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{si.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {si.brand && `${si.brand} `}
                          {si.modelNumber && `| MN: ${si.modelNumber}`}
                          {si.trackingType === 'SERIALIZED' && si.serialNumbers && (
                            <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {si.serialNumbers.map((sn) => (
                                <span
                                  key={sn}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 5px',
                                    backgroundColor: '#E2E8F0',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    color: '#334155',
                                  }}
                                >
                                  {sn}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSerial(idx, sn)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      padding: 0,
                                      fontSize: '0.75rem',
                                      lineHeight: 1,
                                      color: '#94A3B8',
                                    }}
                                    title="Remove serial"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {si.warehouseName} [{si.cityCode}]
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {si.trackingType === 'BULK' ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <QuantityStepper
                              value={si.quantity}
                              min={1}
                              max={si.maxAvailableQty}
                              onChange={(val) => handleBulkQtyChange(idx, val)}
                              size="sm"
                            />
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              avail: {si.maxAvailableQty} {si.unitSymbol}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: '#2250A1', fontSize: '0.8rem' }}>
                            {si.quantity} Unit(s)
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </StepWizardModal.Step>
    </StepWizardModal>
  );
};

export default AddOutgoingModal;

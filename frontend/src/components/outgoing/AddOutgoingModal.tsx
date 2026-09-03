import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Textarea, Button, ConfirmModal, QuantityStepper, SearchableSelect } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';
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

export const AddOutgoingModal: React.FC<AddOutgoingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Step 2 State
  const [selectedItems, setSelectedItems] = useState<SelectedOutgoingItem[]>([]);
  const [establishedWarehouseId, setEstablishedWarehouseId] = useState<number | null>(null);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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
    selectedItems.length > 0;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleStep1Continue = () => {
    if (!selectedProjectId) {
      setErrorMsg('Please select a Destination Project');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('Manual Dispatch Reason is mandatory');
      return;
    }
    setErrorMsg(null);
    setStep(2);
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

  const handleRemoveSelectedItem = (index: number) => {
    const updated = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(updated);
    if (updated.length === 0) {
      setEstablishedWarehouseId(null);
    }
  };

  const handleBulkQtyChange = (index: number, val: number) => {
    const item = selectedItems[index];
    const boundedQty = Math.max(1, Math.min(val, item.maxAvailableQty));
    const updated = [...selectedItems];
    updated[index] = { ...item, quantity: boundedQty };
    setSelectedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setErrorMsg('Destination project is required');
      return;
    }
    if (!notes.trim()) {
      setErrorMsg('Manual Dispatch Reason is mandatory');
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
        notes: notes.trim(),
        items: itemsPayload,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to dispatch outgoing stock');
    } finally {
      setIsSaving(false);
    }
  };

  const establishedWarehouseName = selectedItems[0]
    ? `${selectedItems[0].warehouseName} [${selectedItems[0].cityCode}]`
    : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title="Record Outgoing Stock Dispatch"
        maxWidth="840px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Step Wizard Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #E2E8F0',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: step === 1 ? 700 : 500,
                  color: step === 1 ? '#2250A1' : '#64748B',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: step === 1 ? '#2250A1' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
                Destination &amp; Reason
              </div>
              <ArrowRight size={14} color="#94A3B8" />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: step === 2 ? 700 : 500,
                  color: step === 2 ? '#2250A1' : '#64748B',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: step === 2 ? '#2250A1' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  2
                </span>
                Inventory &amp; Dispatch Items
              </div>
            </div>

            {/* STEP 1: DESTINATION & REASON */}
            {step === 1 && (
              <div>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Destination Project *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      required
                      placeholder="Search destination project or site code..."
                      searchPlaceholder="Type project name, site code, or client..."
                      value={selectedProjectId}
                      onChange={(val) => setSelectedProjectId(val)}
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

                <FormField label="Dispatch Reason / Purpose *" style={{ marginBottom: 0 }}>
                  <Textarea
                    placeholder="e.g. Field installation batch #1, Site replacement under emergency request..."
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            {/* STEP 2: INVENTORY & DISPATCH ITEMS */}
            {step === 2 && (
              <div>
                {/* Persistent Situational Summary Strip */}
                {selectedProject && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderLeft: '4px solid #2250A1',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748B' }}>Project: </span>
                      <strong style={{ color: '#1E293B' }}>{selectedProject.name}</strong>
                      {selectedProject.siteCode && (
                        <span style={{ color: '#64748B' }}> [{selectedProject.siteCode}]</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Source Hub: </span>
                        <strong style={{ color: establishedWarehouseName ? '#2250A1' : '#64748B' }}>
                          {establishedWarehouseName || 'Unassigned (pick item)'}
                        </strong>
                      </div>

                      <div style={{ width: '1px', height: '14px', backgroundColor: '#CBD5E1' }} />

                      <div>
                        <span style={{ color: '#64748B' }}>Items: </span>
                        <strong style={{ color: '#1E293B' }}>{selectedItems.length}</strong>
                      </div>

                      <div style={{ width: '1px', height: '14px', backgroundColor: '#CBD5E1' }} />

                      <div>
                        <span style={{ color: '#64748B' }}>Serials: </span>
                        <strong style={{ color: '#7C3AED' }}>
                          {selectedItems.filter((i) => i.trackingType === 'SERIALIZED').length}
                        </strong>
                      </div>

                      <div style={{ width: '1px', height: '14px', backgroundColor: '#CBD5E1' }} />

                      <div>
                        <span style={{ color: '#64748B' }}>Bulk: </span>
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
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#1F2839',
                      marginBottom: '6px',
                    }}
                  >
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
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                    Selected Items for Dispatch ({selectedItems.length})
                  </h4>

                  {selectedItems.length === 0 ? (
                    <div
                      style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        border: '1px dashed #D1D5DB',
                        borderRadius: '6px',
                        color: '#6B7280',
                        fontSize: '0.85rem',
                      }}
                    >
                      No items selected yet. Search and click "+ Add" from available inventory above.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                      <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC' }}>
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
                                            fontFamily: 'monospace',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            backgroundColor: '#F5F3FF',
                                            color: '#7C3AED',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            border: '1px solid #DDD6FE',
                                          }}
                                        >
                                          {sn}
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
                                  onClick={() => handleRemoveSelectedItem(idx)}
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
              </div>
            )}
          </div>

          {/* Modal Footer with Wizard Navigation */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {step === 1 ? (
              <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
                Cancel
              </Button>
            ) : (
              <Button
                variant="secondary"
                type="button"
                onClick={() => setStep(1)}
                disabled={isSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <ArrowLeft size={16} /> Back to Step 1
              </Button>
            )}

            {step === 1 ? (
              <Button
                variant="primary"
                type="button"
                onClick={handleStep1Continue}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Continue to Inventory <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" type="submit" isLoading={isSaving}>
                Dispatch Stock
              </Button>
            )}
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
        message="You have unsaved changes in this outgoing dispatch form. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        variant="danger"
      />
    </>
  );
};

export default AddOutgoingModal;

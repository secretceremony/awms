import React, { useState, useEffect } from 'react';
import {
  Modal,
  FormField,
  Input,
  Textarea,
  Button,
  ConfirmModal,
  QuantityStepper,
  SearchableSelect,
} from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import {
  Trash2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { ProjectSnapshotCard } from '../common/ProjectSnapshotCard.js';
import { InventoryPicker, type InventoryItemOption } from '../common/InventoryPicker.js';

export interface ProjectOption {
  id: number;
  name: string;
  location: string;
  siteCode: string | null;
  referenceNumber: string | null;
  status: string;
  client?: {
    id: number;
    name: string;
    clientType: string;
  };
  clientContact?: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export interface SelectedDoItem {
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unit: string;
  unitSymbol: string;
  warehouseId: number;
  warehouseName: string;
  cityCode: string;
  quantity: number;
  maxAvailable: number;
  pic?: string;
  remarks?: string;
  serialNumbers?: string[];
}

export interface DeliveryOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryOrderId?: number | null;
  onSuccess: () => void;
}

export const DeliveryOrderFormModal: React.FC<DeliveryOrderFormModalProps> = ({
  isOpen,
  onClose,
  deliveryOrderId,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Delivery Information
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [doDate, setDoDate] = useState(new Date().toISOString().split('T')[0]);
  const [activity, setActivity] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Inventory & Items
  const [selectedItems, setSelectedItems] = useState<SelectedDoItem[]>([]);
  const [establishedWarehouseId, setEstablishedWarehouseId] = useState<number | null>(null);
  const [sharedPic, setSharedPic] = useState('');

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
      setErrorMsg(null);

      if (deliveryOrderId) {
        // Load existing DO for edit
        const loadDo = async () => {
          try {
            const data: any = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
            setSelectedProjectId(String(data.projectId));
            setDoDate(data.doDate ? data.doDate.split('T')[0] : new Date().toISOString().split('T')[0]);
            setActivity(data.activity || '');
            setNotes(data.notes || '');

            const mappedItems: SelectedDoItem[] = (data.items || []).map((it: any) => ({
              itemId: it.itemId,
              itemName: it.item?.name || 'Item',
              brand: it.item?.brand || null,
              modelNumber: it.item?.modelNumber || null,
              trackingType: it.item?.trackingType || 'BULK',
              unit: it.item?.unit?.name || 'pcs',
              unitSymbol: it.item?.unit?.symbol || 'pcs',
              warehouseId: data.warehouseId || 1,
              warehouseName: data.warehouse?.name || 'Warehouse',
              cityCode: data.warehouse?.cityCode || 'BPN',
              quantity: it.quantity,
              maxAvailable: it.quantity + 50,
              pic: it.pic || '',
              remarks: it.remarks || '',
              serialNumbers: (it.deliveryOrderSerials || []).map((s: any) => s.itemSerial?.serialNumber).filter(Boolean),
            }));

            setSelectedItems(mappedItems);
            if (data.warehouseId) {
              setEstablishedWarehouseId(data.warehouseId);
            }
          } catch (err: any) {
            console.error('Failed to load DO details:', err);
            setErrorMsg(err.message || 'Failed to load DO');
          }
        };
        loadDo();
      } else {
        setSelectedProjectId('');
        setDoDate(new Date().toISOString().split('T')[0]);
        setActivity('');
        setNotes('');
        setSelectedItems([]);
        setEstablishedWarehouseId(null);
        setSharedPic('');
      }
    }
  }, [isOpen, deliveryOrderId]);

  const selectedProject = projects.find((p) => String(p.id) === selectedProjectId);
  const isMissingReference = selectedProject && !selectedProject.referenceNumber;

  const isDirty =
    Boolean(selectedProjectId) ||
    Boolean(activity) ||
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
      setErrorMsg('Please select a Project');
      return;
    }
    if (isMissingReference) {
      setErrorMsg(
        'This project requires a Reference Number before a Delivery Order can be created. Please update the project master first.',
      );
      return;
    }
    if (!activity.trim()) {
      setErrorMsg('Activity is mandatory');
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
        `All items in a Delivery Order must originate from the same warehouse. Currently locked to Hub #${establishedWarehouseId}.`,
      );
      return;
    }

    if (item.trackingType === 'BULK') {
      const existingIdx = selectedItems.findIndex(
        (si) => si.itemId === item.itemId && si.warehouseId === item.warehouseId,
      );
      if (existingIdx >= 0) {
        const current = selectedItems[existingIdx];
        if (current.quantity < current.maxAvailable) {
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
            unit: item.unit,
            unitSymbol: item.unitSymbol,
            warehouseId: item.warehouseId,
            warehouseName: item.warehouseName,
            cityCode: item.cityCode,
            quantity: 1,
            maxAvailable: item.availableQty,
            pic: sharedPic || '',
            remarks: '',
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
            unit: item.unit,
            unitSymbol: item.unitSymbol,
            warehouseId: item.warehouseId,
            warehouseName: item.warehouseName,
            cityCode: item.cityCode,
            quantity: 1,
            maxAvailable: item.availableQty,
            pic: sharedPic || '',
            remarks: '',
            serialNumbers: [sn],
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

  const handleItemPropertyChange = (index: number, field: 'quantity' | 'pic' | 'remarks', value: any) => {
    const updated = [...selectedItems];
    const current = updated[index];
    if (field === 'quantity') {
      const bQty = Math.max(1, Math.min(value, current.maxAvailable));
      updated[index] = { ...current, quantity: bQty };
    } else {
      updated[index] = { ...current, [field]: value };
    }
    setSelectedItems(updated);
  };

  // Rule 23: Apply PIC to All Items
  const handleApplyPicToAll = () => {
    if (!sharedPic.trim()) return;
    const updated = selectedItems.map((si) => ({
      ...si,
      pic: sharedPic.trim(),
    }));
    setSelectedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setErrorMsg('Project is required');
      return;
    }
    if (!activity.trim()) {
      setErrorMsg('Activity is mandatory');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least one item from available inventory');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const itemsPayload = selectedItems.map((si) => ({
        itemId: si.itemId,
        quantity: si.quantity,
        pic: si.pic?.trim() || undefined,
        remarks: si.remarks?.trim() || undefined,
        serialNumbers: si.trackingType === 'SERIALIZED' ? si.serialNumbers : undefined,
      }));

      const payload = {
        projectId: Number(selectedProjectId),
        doDate: doDate ? new Date(doDate).toISOString() : new Date().toISOString(),
        activity: activity.trim(),
        notes: notes.trim() || undefined,
        items: itemsPayload,
      };

      if (deliveryOrderId) {
        await apiClient.patch(`/delivery-orders/${deliveryOrderId}`, payload);
      } else {
        await apiClient.post('/delivery-orders', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save Delivery Order');
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
        title={deliveryOrderId ? 'Edit Delivery Order Draft' : 'Create Delivery Order Draft'}
        maxWidth="860px"
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
                Delivery Information
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
                Inventory &amp; Line Items
              </div>
            </div>

            {/* STEP 1: DELIVERY INFORMATION */}
            {step === 1 && (
              <div>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <FormField label="Destination Project *" required style={{ marginBottom: 0 }}>
                    <SearchableSelect
                      disabled={Boolean(deliveryOrderId)}
                      required
                      placeholder="Search destination project..."
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

                  <FormField label="Document Date *" style={{ marginBottom: 0 }}>
                    <Input
                      type="date"
                      required
                      value={doDate}
                      onChange={(e) => setDoDate(e.target.value)}
                    />
                  </FormField>
                </div>

                {/* Project Snapshot Card Preview */}
                {selectedProject && (
                  <div>
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

                    {isMissingReference && (
                      <div
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          color: '#B91C1C',
                          fontSize: '0.85rem',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertCircle size={16} />
                        <div>
                          <strong>Missing Reference Number:</strong> This project requires a Reference Number (PO / Contract) before a Delivery Order can be created.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rule 21: Activity remains free text */}
                <FormField label="Activity / Dispatch Purpose *">
                  <Input
                    placeholder="e.g. Mobilization, Site Equipment Replacement, Maintenance Dispatch..."
                    required
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                  />
                </FormField>

                <FormField label="Special Instructions / Delivery Notes" style={{ marginBottom: 0 }}>
                  <Textarea
                    placeholder="e.g. Handover to site supervisor upon arrival, fragile handling required..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            {/* STEP 2: INVENTORY & LINE ITEMS */}
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
                      <span style={{ color: '#64748B' }}>DO For: </span>
                      <strong style={{ color: '#1E293B' }}>{selectedProject.name}</strong>
                      <span style={{ color: '#64748B' }}> | Ref: </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1' }}>
                        {selectedProject.referenceNumber || '—'}
                      </span>
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
                          {selectedItems
                            .filter((i) => i.trackingType === 'SERIALIZED')
                            .reduce((acc, curr) => acc + (curr.serialNumbers?.length || 0), 0)}
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

                {/* Available Inventory Picker */}
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
                    height="180px"
                  />
                </div>

                {/* Rule 22 & 23: Shared Internal PIC with Apply to All */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                  }}
                >
                  <Users size={16} color="#64748B" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                    Shared Internal PIC:
                  </span>
                  <Input
                    placeholder="e.g. Agung (Logistics Lead), Field Tech Team..."
                    value={sharedPic}
                    onChange={(e) => setSharedPic(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', flex: '1 1 180px', minWidth: '150px' }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyPicToAll}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Apply PIC to All Items
                  </Button>
                </div>

                {/* Selected Items Table with Line-item PIC & Remarks */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                    Document Items ({selectedItems.length})
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
                      No items selected yet. Click "+ Add" on available stock above.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table className="data-table" style={{ margin: 0, fontSize: '0.85rem', minWidth: '500px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC' }}>
                            <th>Item &amp; Model</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Qty</th>
                            <th style={{ width: '150px' }}>Internal PIC</th>
                            <th style={{ width: '160px' }}>Remarks</th>
                            <th style={{ width: '40px', textAlign: 'center' }}></th>
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

                              <td style={{ textAlign: 'center' }}>
                                {si.trackingType === 'BULK' ? (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <QuantityStepper
                                      value={si.quantity}
                                      min={1}
                                      max={si.maxAvailable}
                                      onChange={(val) => handleItemPropertyChange(idx, 'quantity', val)}
                                      size="sm"
                                    />
                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                      avail: {si.maxAvailable} {si.unitSymbol}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontWeight: 700, color: '#2250A1', fontSize: '0.8rem' }}>
                                    {si.quantity} {si.unitSymbol}
                                  </span>
                                )}
                              </td>

                              <td>
                                <Input
                                  placeholder="Internal PIC..."
                                  value={si.pic || ''}
                                  onChange={(e) => handleItemPropertyChange(idx, 'pic', e.target.value)}
                                  style={{ padding: '3px 6px', fontSize: '0.8rem' }}
                                />
                              </td>

                              <td>
                                <Input
                                  placeholder="Remarks..."
                                  value={si.remarks || ''}
                                  onChange={(e) => handleItemPropertyChange(idx, 'remarks', e.target.value)}
                                  style={{ padding: '3px 6px', fontSize: '0.8rem' }}
                                />
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

          {/* Modal Footer */}
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
                disabled={Boolean(isMissingReference)}
                onClick={handleStep1Continue}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Continue to Line Items <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" type="submit" isLoading={isSaving}>
                {deliveryOrderId ? 'Save Changes' : 'Save Delivery Order Draft'}
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
        message="You have unsaved changes in this Delivery Order form. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        variant="danger"
      />
    </>
  );
};

export default DeliveryOrderFormModal;

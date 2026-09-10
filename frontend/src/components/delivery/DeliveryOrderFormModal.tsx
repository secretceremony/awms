import React, { useState, useEffect } from 'react';
import {
  StepWizardModal,
  FormField,
  Input,
  Textarea,
  Button,
} from '../ui/index.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { toDateTimeLocalInput } from '../../utils/datetime.js';
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Calendar,
} from 'lucide-react';

export interface EligibleOutgoing {
  id: number;
  movementNumber: string;
  movementDate: string;
  notes?: string | null;
  sourceWarehouse?: {
    id: number;
    name: string;
    cityCode: string;
    location: string;
  };
  project?: {
    id: number;
    name: string;
    location: string;
    siteCode?: string | null;
    referenceNumber?: string | null;
    status: string;
    client?: {
      id: number;
      name: string;
      clientType: string;
    };
    clientContact?: {
      id: number;
      name: string;
      phone?: string | null;
      email?: string | null;
    };
  };
  items: Array<{
    id: number;
    itemId: number;
    quantity: number;
    item: {
      id: number;
      name: string;
      brand?: string | null;
      modelNumber?: string | null;
      trackingType: 'BULK' | 'SERIALIZED';
      unit?: { name: string; symbol: string };
    };
    movementSerials?: Array<{
      id: number;
      itemSerial: {
        id: number;
        serialNumber: string;
        state: string;
        conditionLabel?: string | null;
      };
    }>;
  }>;
}

export interface SelectedDoItem {
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unit: string;
  unitSymbol: string;
  quantity: number;
  pic?: string;
  remarks?: string;
  serialNumbers?: string[];
}

export interface DeliveryOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryOrderId?: number | null;
  initialStockMovementId?: number | null;
  onSuccess: () => void;
}

const WIZARD_STEPS = [
  { id: 1, label: 'Select Outgoing Dispatch' },
  { id: 2, label: 'Configure Delivery Order Details' },
];

export const DeliveryOrderFormModal: React.FC<DeliveryOrderFormModalProps> = ({
  isOpen,
  onClose,
  deliveryOrderId,
  initialStockMovementId,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);

  // Eligible Outgoings list for Step 1
  const [eligibleOutgoings, setEligibleOutgoings] = useState<EligibleOutgoing[]>([]);
  const [searchOutgoing, setSearchOutgoing] = useState('');
  const [isLoadingOutgoings, setIsLoadingOutgoings] = useState(false);
  const [selectedOutgoing, setSelectedOutgoing] = useState<EligibleOutgoing | null>(null);

  // Step 2: Document details
  const [doDate, setDoDate] = useState(toDateTimeLocalInput());
  const [activity, setActivity] = useState('General Dispatch');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedDoItem[]>([]);
  const [sharedPic, setSharedPic] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch eligible outgoings
  const fetchEligibleOutgoings = async (searchQuery?: string) => {
    setIsLoadingOutgoings(true);
    try {
      const res: any = await apiClient.get('/delivery-orders/eligible-outgoings', {
        params: { search: searchQuery || undefined },
      });
      const list = Array.isArray(res) ? res : res?.data || [];
      setEligibleOutgoings(list);
      return list;
    } catch (err) {
      console.error('Failed to load eligible outgoings:', err);
      return [];
    } finally {
      setIsLoadingOutgoings(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setSelectedOutgoing(null);
    setSelectedItems([]);
    setStep(1);

    if (deliveryOrderId) {
      // Load existing DO for edit
      const loadDo = async () => {
        try {
          const data: any = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
          setDoDate(toDateTimeLocalInput(data.date));
          setActivity(data.activity || 'General Dispatch');
          setNotes(data.notes || '');

          const mappedItems: SelectedDoItem[] = (data.items || []).map((it: any) => ({
            itemId: it.itemId,
            itemName: it.itemName || it.item?.name || 'Item',
            brand: it.brand || it.item?.brand || null,
            modelNumber: it.modelNumber || it.item?.modelNumber || null,
            trackingType: it.trackingType || it.item?.trackingType || 'BULK',
            unit: it.unitName || it.item?.unit?.name || 'pcs',
            unitSymbol: it.unitSymbol || it.item?.unit?.symbol || 'pcs',
            quantity: it.quantity,
            pic: it.pic || '',
            remarks: it.remarks || '',
            serialNumbers: (it.itemSerials || []).map((s: any) => s.serialNumber || s.itemSerial?.serialNumber).filter(Boolean),
          }));

          setSelectedItems(mappedItems);
          if (data.stockMovement) {
            setSelectedOutgoing(data.stockMovement);
          }
          setStep(2);
        } catch (err: any) {
          console.error('Failed to load DO details:', err);
          const message = err.message || 'Failed to load Delivery Order';
          setErrorMsg(message);
          showToast({
            type: 'error',
            message,
          });
        }
      };
      loadDo();
    } else {
      // New DO creation flow: fetch eligible outgoings
      fetchEligibleOutgoings().then((list) => {
        if (initialStockMovementId) {
          const target = list.find((o: EligibleOutgoing) => o.id === initialStockMovementId);
          if (target) {
            handleSelectOutgoing(target);
          }
        }
      });
      setDoDate(new Date().toISOString().split('T')[0]);
      setActivity('General Dispatch');
      setNotes('');
      setSharedPic('');
    }
  }, [isOpen, deliveryOrderId, initialStockMovementId]);

  const handleSelectOutgoing = (outgoing: EligibleOutgoing) => {
    setSelectedOutgoing(outgoing);
    setErrorMsg(null);

    // Populate items from outgoing
    const mapped: SelectedDoItem[] = (outgoing.items || []).map((mi) => ({
      itemId: mi.itemId,
      itemName: mi.item.name,
      brand: mi.item.brand || null,
      modelNumber: mi.item.modelNumber || null,
      trackingType: mi.item.trackingType,
      unit: mi.item.unit?.name || 'pcs',
      unitSymbol: mi.item.unit?.symbol || 'pcs',
      quantity: mi.quantity,
      pic: '',
      remarks: '',
      serialNumbers: mi.item.trackingType === 'SERIALIZED'
        ? (mi.movementSerials || []).map((ms) => ms.itemSerial.serialNumber).filter(Boolean)
        : undefined,
    }));

    setSelectedItems(mapped);
    if (outgoing.movementDate) {
      setDoDate(outgoing.movementDate.split('T')[0]);
    }
    if (outgoing.notes) {
      setNotes(outgoing.notes);
    }
  };

  const isMissingReference = Boolean(selectedOutgoing?.project && !selectedOutgoing.project.referenceNumber);

  const handleStep1Continue = () => {
    if (!selectedOutgoing) {
      setErrorMsg('Please select an Outgoing transaction to create a Delivery Order.');
      return false;
    }
    if (isMissingReference) {
      setErrorMsg(
        'This project requires a Reference Number before a Delivery Order can be issued. Please update the Project Reference Number in the Projects module first.',
      );
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleItemPropertyChange = (index: number, field: 'pic' | 'remarks', value: string) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const handleApplyPicToAll = () => {
    if (!sharedPic.trim()) return;
    const updated = selectedItems.map((si) => ({
      ...si,
      pic: sharedPic.trim(),
    }));
    setSelectedItems(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOutgoing && !deliveryOrderId) {
      setErrorMsg('Outgoing transaction must be selected.');
      return;
    }
    if (!activity.trim()) {
      setErrorMsg('Activity is mandatory');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Dispatched items list cannot be empty.');
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
        stockMovementId: selectedOutgoing?.id || undefined,
        projectId: selectedOutgoing?.project?.id || 0,
        date: doDate ? new Date(doDate).toISOString() : new Date().toISOString(),
        activity: activity.trim(),
        notes: notes.trim() || undefined,
        items: itemsPayload,
      };

      if (deliveryOrderId) {
        await apiClient.patch(`/delivery-orders/${deliveryOrderId}/draft`, payload);
      } else {
        await apiClient.post('/delivery-orders/draft', payload);
      }

      showToast({
        type: 'success',
        message: deliveryOrderId
          ? 'Delivery Order draft updated successfully'
          : 'Delivery Order draft created successfully',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const message = err.message || 'Failed to save Delivery Order';
      setErrorMsg(message);
      showToast({
        type: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty =
    Boolean(selectedOutgoing) ||
    selectedItems.length > 0 ||
    Boolean(notes.trim()) ||
    activity !== 'General Dispatch';

  return (
    <StepWizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={deliveryOrderId ? 'Edit Delivery Order Draft' : 'Create Delivery Order from Outgoing Dispatch'}
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={(s) => setStep(s as 1 | 2)}
      maxWidth="860px"
      errorMsg={errorMsg}
      isDirty={isDirty}
      isSubmitting={isSaving}
      canContinue={Boolean(selectedOutgoing && !isMissingReference)}
      continueLabel="Next: Configure Details"
      backLabel="Back"
      cancelLabel="Cancel"
      submitLabel={deliveryOrderId ? 'Save DO Draft' : 'Create Delivery Order Draft'}
      hideBack={Boolean(deliveryOrderId)}
      showCancelOnAllSteps={true}
      onContinue={handleStep1Continue}
      onSubmit={handleSubmit}
      discardTitle="Discard Draft Changes?"
      discardMessage="You have unsaved changes. Are you sure you want to close without saving?"
      discardConfirmLabel="Discard"
    >
      {/* STEP 1: SELECT OUTGOING */}
      <StepWizardModal.Step step={1}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              Delivery Orders are generated directly from posted <strong>Outgoing stock movements</strong>. Select the outgoing dispatch transaction to populate client details, destination site, and dispatched inventory lines.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              placeholder="Search movement number, project, client, or items..."
              value={searchOutgoing}
              onChange={(e) => {
                setSearchOutgoing(e.target.value);
                fetchEligibleOutgoings(e.target.value);
              }}
              style={{ flex: 1 }}
            />
          </div>

          {isLoadingOutgoings ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
              Loading eligible outgoing movements...
            </div>
          ) : eligibleOutgoings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
              <Package size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#334155' }}>
                No unlinked Outgoing movements found
              </p>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                All posted outgoings are already linked to Delivery Orders, or no outgoing dispatches exist for active projects.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {eligibleOutgoings.map((out) => {
                const isSelected = selectedOutgoing?.id === out.id;
                const hasRef = Boolean(out.project?.referenceNumber?.trim());
                const totalBulk = out.items.reduce((acc, i) => acc + (i.item.trackingType === 'BULK' ? i.quantity : 0), 0);
                const totalSerials = out.items.reduce((acc, i) => acc + (i.item.trackingType === 'SERIALIZED' ? i.quantity : 0), 0);

                return (
                  <div
                    key={out.id}
                    onClick={() => handleSelectOutgoing(out)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2250A1' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? 'rgba(34, 80, 161, 0.04)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#2250A1' : '#1E293B' }}>
                          #{out.movementNumber}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {out.movementDate ? new Date(out.movementDate).toLocaleDateString() : '—'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!hasRef && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                            }}
                          >
                            Missing Ref No
                          </span>
                        )}
                        {isSelected && <CheckCircle2 size={18} color="#2250A1" />}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                          {out.project?.name || 'Unassigned Project'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          Client: <strong>{out.project?.client?.name || '—'}</strong>
                          {out.project?.siteCode && ` | Site: [${out.project.siteCode}]`}
                          {out.project?.referenceNumber && ` | Ref: ${out.project.referenceNumber}`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                          {out.items.length} line(s)
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {totalBulk > 0 && `${totalBulk} bulk`}
                          {totalBulk > 0 && totalSerials > 0 && ', '}
                          {totalSerials > 0 && `${totalSerials} serial(s)`}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748B' }}>
                      <span>Source: {out.sourceWarehouse?.name} [{out.sourceWarehouse?.cityCode}]</span>
                      <span style={{ fontStyle: 'italic', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {out.items.map((it) => it.item.name).slice(0, 2).join(', ')}{out.items.length > 2 ? ` +${out.items.length - 2} more` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isMissingReference && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991B1B',
                fontSize: '0.825rem',
              }}
            >
              <AlertCircle size={18} color="#DC2626" />
              <span>
                The selected project <strong>"{selectedOutgoing?.project?.name}"</strong> does not have a Reference Number. Delivery Orders require an official Project Reference Number. Please update the project before proceeding.
              </span>
            </div>
          )}
        </div>
      </StepWizardModal.Step>

      {/* STEP 2: DOCUMENT DETAILS & ITEMS REVIEW */}
      <StepWizardModal.Step step={2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Outgoing & Project Context Snapshot */}
          {selectedOutgoing?.project && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.5px' }}>
                  Source Outgoing &amp; Client Dispatch Snapshot
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2250A1' }}>
                  Movement #{selectedOutgoing.movementNumber}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.825rem' }}>
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Client Company</div>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>{selectedOutgoing.project.client?.name || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Attention (PIC)</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedOutgoing.project.clientContact?.name || '—'}
                    {selectedOutgoing.project.clientContact?.phone && ` (${selectedOutgoing.project.clientContact.phone})`}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Destination Project</div>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>{selectedOutgoing.project.name}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.75rem' }}>Site / Ref No</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedOutgoing.project.siteCode ? `[${selectedOutgoing.project.siteCode}] ` : ''}
                    <span style={{ color: '#0F766E' }}>{selectedOutgoing.project.referenceNumber || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Metadata Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Delivery Order Date & Time *" required>
              <Input
                type="datetime-local"
                value={doDate}
                onChange={(e) => setDoDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Activity / Scope *" required>
              <Input
                placeholder="e.g. Dispatched to Balikpapan Project Site"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Document Notes / Remarks (Optional)">
            <Textarea
              placeholder="Specific remarks, delivery instructions, or carrier details..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          {/* Dispatched Items Table with PIC/Remarks */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                Dispatched Items ({selectedItems.length} lines)
              </h4>

              {/* Fast PIC Application */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Input
                  placeholder="Fast PIC for all items"
                  value={sharedPic}
                  onChange={(e) => setSharedPic(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '3px 6px', width: '160px' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplyPicToAll}
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Apply to All
                </Button>
              </div>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                    <th style={{ padding: '8px 10px', width: '30px' }}>No</th>
                    <th style={{ padding: '8px 10px' }}>Item Description</th>
                    <th style={{ padding: '8px 10px', width: '120px' }}>Qty / Serials</th>
                    <th style={{ padding: '8px 10px', width: '160px' }}>Assigned PIC</th>
                    <th style={{ padding: '8px 10px', width: '180px' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{item.itemName}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748B' }}>
                          {[item.brand, item.modelNumber].filter(Boolean).join(' - ') || 'Generic'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#0F766E' }}>
                          {item.quantity} {item.unitSymbol}
                        </div>
                        {item.trackingType === 'SERIALIZED' && item.serialNumbers && (
                          <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px', fontFamily: 'monospace' }}>
                            {item.serialNumbers.slice(0, 3).join(', ')}
                            {item.serialNumbers.length > 3 ? ` +${item.serialNumbers.length - 3} more` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <Input
                          placeholder="PIC name"
                          value={item.pic || ''}
                          onChange={(e) => handleItemPropertyChange(idx, 'pic', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <Input
                          placeholder="Condition / notes"
                          value={item.remarks || ''}
                          onChange={(e) => handleItemPropertyChange(idx, 'remarks', e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </StepWizardModal.Step>
    </StepWizardModal>
  );
};

export default DeliveryOrderFormModal;

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
} from '../ui/index.js';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Truck, FileText, Maximize2 } from 'lucide-react';
import { ProjectSnapshotCard } from '../common/ProjectSnapshotCard.js';
import { getCompanyIdentity } from '../../config/company.js';
import { toDateTimeLocalInput } from '../../utils/datetime.js';

export interface ShippingLabel {
  id: number;
  deliveryOrderId: number | null;
  sourceType: 'DO' | 'STANDALONE';
  shipDate: string;
  recipientName: string;
  attnName: string | null;
  destination: string;
  referenceNumber: string | null;
  doNumber: string | null;
  senderName: string | null;
  senderAddress: string | null;
  senderPhone: string | null;
  isFragile: boolean;
  handlingNote: string | null;
  labelWidth: number;
  labelHeight: number;
  notes: string | null;
  createdAt: string;
  deliveryOrder?: {
    id: number;
    doNumber: string | null;
    status: string;
    ptsNumber?: string | null;
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ShippingLabelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  shippingLabel?: ShippingLabel | null;
  onSuccess: () => void;
}

export const ShippingLabelFormModal: React.FC<ShippingLabelFormModalProps> = ({
  isOpen,
  onClose,
  shippingLabel,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [sourceType, setSourceType] = useState<'DO' | 'STANDALONE'>('DO');
  const [issuedDos, setIssuedDos] = useState<any[]>([]);
  const [selectedDoId, setSelectedDoId] = useState('');
  const [labelSizeChoice, setLabelSizeChoice] = useState<'A6' | 'A5'>('A6');

  const [formData, setFormData] = useState({
    shipDate: toDateTimeLocalInput(),
    recipientName: '',
    attnName: '',
    destination: '',
    referenceNumber: '',
    doNumber: '',
    senderName: 'PT ALSSA Corporindo',
    senderAddress: '',
    senderPhone: '',
    isFragile: false,
    handlingNote: '',
    labelWidth: 148,
    labelHeight: 105,
    notes: '',
  });

  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Load Issued DOs on open
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dosRes: any = await apiClient.get('/delivery-orders', { params: { status: 'ISSUED', limit: 100 } });
        const doList = Array.isArray(dosRes) ? dosRes : dosRes?.data || [];
        setIssuedDos(doList);

        if (shippingLabel) {
          setSourceType(shippingLabel.sourceType);
          setSelectedDoId(shippingLabel.deliveryOrderId ? String(shippingLabel.deliveryOrderId) : '');
          const isA5 = shippingLabel.labelWidth >= 200 || shippingLabel.labelHeight >= 140;
          setLabelSizeChoice(isA5 ? 'A5' : 'A6');

          const init = {
            shipDate: toDateTimeLocalInput(shippingLabel.shipDate),
            recipientName: shippingLabel.recipientName,
            attnName: shippingLabel.attnName || '',
            destination: shippingLabel.destination,
            referenceNumber: shippingLabel.referenceNumber || '',
            doNumber: shippingLabel.doNumber || '',
            senderName: shippingLabel.senderName || 'PT ALSSA Corporindo',
            senderAddress: shippingLabel.senderAddress || '',
            senderPhone: shippingLabel.senderPhone || '',
            isFragile: shippingLabel.isFragile,
            handlingNote: shippingLabel.handlingNote || '',
            labelWidth: isA5 ? 210 : 148,
            labelHeight: isA5 ? 148 : 105,
            notes: shippingLabel.notes || '',
          };
          setFormData(init);
          setInitialData(init);
        } else {
          setSourceType('DO');
          setSelectedDoId('');
          setLabelSizeChoice('A6');
          const defaultIdentity = getCompanyIdentity('BPN');

          const init = {
            shipDate: toDateTimeLocalInput(),
            recipientName: '',
            attnName: '',
            destination: '',
            referenceNumber: '',
            doNumber: '',
            senderName: defaultIdentity.companyName,
            senderAddress: defaultIdentity.address,
            senderPhone: defaultIdentity.phone,
            isFragile: false,
            handlingNote: '',
            labelWidth: 148,
            labelHeight: 105,
            notes: '',
          };
          setFormData(init);
          setInitialData(init);
        }
      } catch (err) {
        console.error('Failed to load issued DOs:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setErrorMsg(null);
    }
  }, [isOpen, shippingLabel]);

  // Handle DO Selection Autofill
  const handleSelectDo = async (doIdStr: string) => {
    setSelectedDoId(doIdStr);
    if (!doIdStr) {
      setFormData((prev) => ({
        ...prev,
        recipientName: '',
        attnName: '',
        destination: '',
        referenceNumber: '',
        doNumber: '',
      }));
      return;
    }

    try {
      const doDetail: any = await apiClient.get(`/delivery-orders/${doIdStr}`);
      const snapshot = doDetail.snapshots || {};

      const clientName = doDetail.clientCompanyName || snapshot.client?.name || doDetail.client?.name || '';
      const attnName = doDetail.attnName || snapshot.attn?.name || doDetail.project?.clientContact?.name || '';
      const destination = doDetail.projectLocation || snapshot.project?.location || doDetail.project?.location || '';
      const refNumber = doDetail.referenceNumber || snapshot.project?.referenceNumber || doDetail.project?.referenceNumber || '';
      const doNumber = doDetail.doNumber || '';

      const whCityCode = doDetail.warehouseCityCode || snapshot.warehouse?.cityCode || doDetail.sourceWarehouse?.cityCode || 'BPN';
      const senderIdentity = getCompanyIdentity(whCityCode);

      setFormData((prev) => ({
        ...prev,
        recipientName: clientName,
        attnName: attnName,
        destination: destination,
        referenceNumber: refNumber,
        doNumber: doNumber,
        senderName: senderIdentity.companyName,
        senderAddress: senderIdentity.address,
        senderPhone: senderIdentity.phone,
      }));
    } catch (err: any) {
      console.error('Failed to fetch DO details for autofill:', err);
      showToast({
        type: 'error',
        message: err.message || 'Failed to load Delivery Order details',
      });
    }
  };

  // Handle Label Size Selection
  const handleSizeChange = (size: 'A6' | 'A5') => {
    setLabelSizeChoice(size);
    if (size === 'A5') {
      setFormData((prev) => ({ ...prev, labelWidth: 210, labelHeight: 148 }));
    } else {
      setFormData((prev) => ({ ...prev, labelWidth: 148, labelHeight: 105 }));
    }
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.recipientName.trim()) {
      setErrorMsg('Recipient Company Name is required.');
      return;
    }
    if (!formData.destination.trim()) {
      setErrorMsg('Destination Site Address is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        deliveryOrderId: sourceType === 'DO' && selectedDoId ? parseInt(selectedDoId, 10) : null,
        sourceType,
        shipDate: new Date(formData.shipDate).toISOString(),
        recipientName: formData.recipientName.trim(),
        attnName: formData.attnName.trim() || null,
        destination: formData.destination.trim(),
        referenceNumber: formData.referenceNumber.trim() || null,
        doNumber: formData.doNumber.trim() || null,
        senderName: formData.senderName.trim() || 'PT ALSSA Corporindo',
        senderAddress: formData.senderAddress.trim() || null,
        senderPhone: formData.senderPhone.trim() || null,
        isFragile: formData.isFragile,
        handlingNote: formData.handlingNote.trim() || null,
        labelWidth: formData.labelWidth,
        labelHeight: formData.labelHeight,
        notes: formData.notes.trim() || null,
      };

      if (shippingLabel) {
        await apiClient.put(`/shipping-labels/${shippingLabel.id}`, payload);
      } else {
        await apiClient.post('/shipping-labels', payload);
      }

      showToast({
        type: 'success',
        message: shippingLabel
          ? 'Shipping label updated successfully'
          : 'Shipping label created successfully',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const message = err.message || 'Failed to save shipping label.';
      setErrorMsg(message);
      showToast({
        type: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedDo = issuedDos.find((d) => String(d.id) === selectedDoId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={shippingLabel ? `Edit Shipping Label #${shippingLabel.id}` : 'Create Shipping Label'}
        maxWidth="740px"
      >
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Source Type Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ marginBottom: '6px' }}>
                Shipping Label Mode <span className="form-label-required">*</span>
              </label>
              <SegmentedControl<'DO' | 'STANDALONE'>
                value={sourceType}
                onChange={(val) => {
                  setSourceType(val);
                  if (val === 'STANDALONE') {
                    setSelectedDoId('');
                  }
                }}
                options={[
                  {
                    value: 'DO',
                    label: 'From Issued Delivery Order (Recommended)',
                    icon: <FileText size={16} />,
                  },
                  {
                    value: 'STANDALONE',
                    label: 'Standalone Package Dispatch',
                    icon: <Truck size={16} />,
                  },
                ]}
              />
            </div>

            {/* DO Selection Section */}
            {sourceType === 'DO' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <FormField label="Select Issued Delivery Order *" required>
                  <Select
                    value={selectedDoId}
                    onChange={(e) => handleSelectDo(e.target.value)}
                    required
                  >
                    <option value="">-- Choose an issued Delivery Order --</option>
                    {issuedDos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.doNumber} — {d.clientCompanyName || d.project?.name || `DO #${d.id}`} (
                        {new Date(d.date).toLocaleDateString()})
                      </option>
                    ))}
                  </Select>
                </FormField>

                {selectedDo && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <ProjectSnapshotCard
                      projectName={selectedDo.project?.name || selectedDo.projectName}
                      siteCode={selectedDo.project?.siteCode || selectedDo.siteCode}
                      referenceNumber={selectedDo.referenceNumber || selectedDo.project?.referenceNumber}
                      clientName={selectedDo.client?.name || selectedDo.clientCompanyName}
                      clientType={selectedDo.client?.clientType || selectedDo.clientType}
                      attnName={selectedDo.attnName || selectedDo.project?.clientContact?.name}
                      attnPhone={selectedDo.attnPhone || selectedDo.project?.clientContact?.phone}
                      projectLocation={selectedDo.projectLocation || selectedDo.project?.location}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Label Size Selector (A6 Default vs A5) */}
            <div className="shipping-format-card">
              <label className="form-label" style={{ marginBottom: '8px' }}>
                Label Physical Size <span className="form-label-required">*</span>
              </label>
              <SegmentedControl<'A6' | 'A5'>
                value={labelSizeChoice}
                onChange={handleSizeChange}
                options={[
                  {
                    value: 'A6',
                    label: 'A6 — Compact (148 × 105 mm) [Default]',
                    icon: <Maximize2 size={15} />,
                  },
                  {
                    value: 'A5',
                    label: 'A5 — Large (210 × 148 mm)',
                    icon: <Maximize2 size={16} />,
                  },
                ]}
              />
            </div>

            {/* Recipient Details */}
            <div className="shipping-card">
              <h4 className="shipping-card-header">
                Recipient &amp; Destination Information
              </h4>

              <div className="form-grid">
                <FormField label="Recipient / Client Company *" required>
                  <Input
                    ref={recipientInputRef}
                    placeholder="e.g. PT Pertamina Hulu Mahakam"
                    required
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  />
                </FormField>

                <FormField label="Attn (Recipient Contact Person)">
                  <Input
                    placeholder="e.g. Ir. Budi Santoso"
                    value={formData.attnName}
                    onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Destination / Site Address *" required>
                <Input
                  placeholder="e.g. CPA Sanga-Sanga Field, Handil 2 Logistics Hub"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </FormField>

              <div className="form-grid" style={{ marginBottom: 0 }}>
                <FormField label="Reference Number (PO / Contract)" style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="e.g. PO-PHM-2026-0881"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  />
                </FormField>

                <FormField label="Linked DO Number" style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="e.g. 001/ALS-BPN/DO-PHM/IX/2026"
                    value={formData.doNumber}
                    onChange={(e) => setFormData({ ...formData, doNumber: e.target.value })}
                  />
                </FormField>
              </div>
            </div>

            {/* Sender Dispatch Office */}
            <div className="shipping-sender-card">
              <div className="shipping-sender-header">
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Sender Dispatch Office (PT ALSSA Corporindo)
                </h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const idt = getCompanyIdentity('BPN');
                      setFormData((prev) => ({
                        ...prev,
                        senderName: idt.companyName,
                        senderAddress: idt.address,
                        senderPhone: idt.phone,
                      }));
                    }}
                  >
                    Set Balikpapan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const idt = getCompanyIdentity('JKT');
                      setFormData((prev) => ({
                        ...prev,
                        senderName: idt.companyName,
                        senderAddress: idt.address,
                        senderPhone: idt.phone,
                      }));
                    }}
                  >
                    Set Jakarta
                  </Button>
                </div>
              </div>

              <div className="form-grid">
                <FormField label="Sender Company Name">
                  <Input
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                  />
                </FormField>

                <FormField label="Sender Phone">
                  <Input
                    value={formData.senderPhone}
                    onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Sender Dispatch Address" style={{ marginBottom: 0 }}>
                <Input
                  value={formData.senderAddress}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                />
              </FormField>
            </div>

            {/* Handling & Date Configuration */}
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Ship Date & Time *" required>
                <Input
                  type="datetime-local"
                  required
                  value={formData.shipDate}
                  onChange={(e) => setFormData({ ...formData, shipDate: e.target.value })}
                />
              </FormField>

              <FormField label="Handling Classification *">
                <SegmentedControl<'NO' | 'YES'>
                  value={formData.isFragile ? 'YES' : 'NO'}
                  onChange={(val) => setFormData({ ...formData, isFragile: val === 'YES' })}
                  options={[
                    { value: 'NO', label: 'Standard Package' },
                    { value: 'YES', label: '⚠️ FRAGILE / HANDLE WITH CARE' },
                  ]}
                />
              </FormField>
            </div>

            <FormField label="Handling Notes / Instructions" style={{ marginBottom: '1rem' }}>
              <Input
                placeholder="e.g. KEEP DRY, THIS SIDE UP, DO NOT DROP"
                value={formData.handlingNote}
                onChange={(e) => setFormData({ ...formData, handlingNote: e.target.value.toUpperCase() })}
              />
            </FormField>

            <FormField label="Internal Logistics Notes" style={{ marginBottom: 0 }}>
              <Textarea
                placeholder="e.g. Courier: JNE Trucking, 3 boxes total..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </FormField>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {shippingLabel ? 'Save Changes' : 'Generate Shipping Label'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        title="Discard Changes?"
        message="You have unsaved form entries. Are you sure you want to discard them?"
        confirmLabel="Discard"
        variant="danger"
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        onClose={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};

export default ShippingLabelFormModal;

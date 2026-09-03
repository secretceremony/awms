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
import { apiClient } from '../../api/client.js';
import { Truck, FileText, Building } from 'lucide-react';
import { ProjectSnapshotCard } from '../common/ProjectSnapshotCard.js';
import { getCompanyIdentity } from '../../config/company.js';


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
  const [sourceType, setSourceType] = useState<'DO' | 'STANDALONE'>('DO');
  const [issuedDos, setIssuedDos] = useState<any[]>([]);
  const [selectedDoId, setSelectedDoId] = useState('');

  const [formData, setFormData] = useState({
    shipDate: new Date().toISOString().split('T')[0],
    recipientName: '',
    attnName: '',
    destination: '',
    referenceNumber: '',
    doNumber: '',
    senderName: '',
    senderAddress: '',
    senderPhone: '',
    isFragile: false,
    handlingNote: '',
    labelWidth: 100,
    labelHeight: 150,
    notes: '',
  });

  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Load Settings and Issued DOs on open
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, dosRes]: any = await Promise.all([
          apiClient.get('/settings'),
          apiClient.get('/delivery-orders', { params: { status: 'ISSUED', limit: 100 } }),
        ]);

        const deliverySettings = settingsRes?.delivery || {};
        const doList = Array.isArray(dosRes) ? dosRes : dosRes?.data || [];
        setIssuedDos(doList);

        if (shippingLabel) {
          setSourceType(shippingLabel.sourceType);
          setSelectedDoId(shippingLabel.deliveryOrderId ? String(shippingLabel.deliveryOrderId) : '');
          const init = {
            shipDate: shippingLabel.shipDate ? shippingLabel.shipDate.split('T')[0] : new Date().toISOString().split('T')[0],
            recipientName: shippingLabel.recipientName,
            attnName: shippingLabel.attnName || '',
            destination: shippingLabel.destination,
            referenceNumber: shippingLabel.referenceNumber || '',
            doNumber: shippingLabel.doNumber || '',
            senderName: shippingLabel.senderName || deliverySettings.senderName || '',
            senderAddress: shippingLabel.senderAddress || deliverySettings.senderAddress || '',
            senderPhone: shippingLabel.senderPhone || deliverySettings.senderPhone || '',
            isFragile: shippingLabel.isFragile,
            handlingNote: shippingLabel.handlingNote || '',
            labelWidth: shippingLabel.labelWidth || 100,
            labelHeight: shippingLabel.labelHeight || 150,
            notes: shippingLabel.notes || '',
          };
          setFormData(init);
          setInitialData(init);
        } else {
          setSourceType('DO');
          setSelectedDoId('');
          const parseNum = (str?: string, def = 100) => {
            if (!str) return def;
            const n = parseInt(str.replace(/\D/g, ''), 10);
            return isNaN(n) ? def : n;
          };

          const init = {
            shipDate: new Date().toISOString().split('T')[0],
            recipientName: '',
            attnName: '',
            destination: '',
            referenceNumber: '',
            doNumber: '',
            senderName: deliverySettings.senderName || 'PT ALSSA Corporindo',
            senderAddress: deliverySettings.senderAddress || 'Balikpapan Hub, Kalimantan Timur',
            senderPhone: deliverySettings.senderPhone || '+62 542 876543',
            isFragile: false,
            handlingNote: '',
            labelWidth: parseNum(deliverySettings.labelWidth, 100),
            labelHeight: parseNum(deliverySettings.labelHeight, 150),
            notes: '',
          };
          setFormData(init);
          setInitialData(init);
        }
      } catch (err) {
        console.error('Failed to load settings or DOs for shipping label:', err);
      }
    };

    if (isOpen) {
      fetchData();
      setErrorMsg(null);
      setTimeout(() => {
        recipientInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, shippingLabel]);

  // When an issued DO is selected in "DO" mode, auto-fill fields
  const handleDoSelect = (doIdStr: string) => {
    setSelectedDoId(doIdStr);
    if (!doIdStr) return;

    const matchedDo = issuedDos.find((d) => String(d.id) === doIdStr);
    if (matchedDo) {
      const clientName = matchedDo.client?.name || matchedDo.clientCompanyName || '';
      const attn = matchedDo.attnName || matchedDo.project?.clientContact?.name || '';
      const dest = `${matchedDo.project?.siteCode ? `[${matchedDo.project.siteCode}] ` : ''}${matchedDo.projectLocation || matchedDo.project?.location || matchedDo.project?.name || ''}`;
      const refNo = matchedDo.referenceNumber || matchedDo.project?.referenceNumber || '';
      const doNum = matchedDo.doNumber || '';

      const cityCode = matchedDo.warehouseCityCode || matchedDo.sourceWarehouse?.cityCode || matchedDo.snapshots?.warehouse?.cityCode;
      const identity = getCompanyIdentity(cityCode);

      setFormData((prev) => ({
        ...prev,
        recipientName: clientName,
        attnName: attn,
        destination: dest,
        referenceNumber: refNo,
        doNumber: doNum,
        senderName: identity.companyName,
        senderAddress: identity.address,
        senderPhone: identity.phone,
      }));
    }
  };

  const selectedDoObj = issuedDos.find((d) => String(d.id) === selectedDoId);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientName.trim()) {
      setErrorMsg('Recipient / Company is required');
      return;
    }
    if (!formData.destination.trim()) {
      setErrorMsg('Destination / Site is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        sourceType,
        deliveryOrderId: sourceType === 'DO' && selectedDoId ? Number(selectedDoId) : undefined,
        shipDate: formData.shipDate ? new Date(formData.shipDate).toISOString() : new Date().toISOString(),
        recipientName: formData.recipientName.trim(),
        attnName: formData.attnName.trim() || undefined,
        destination: formData.destination.trim(),
        referenceNumber: formData.referenceNumber.trim() || undefined,
        doNumber: formData.doNumber.trim() || undefined,
        senderName: formData.senderName.trim() || undefined,
        senderAddress: formData.senderAddress.trim() || undefined,
        senderPhone: formData.senderPhone.trim() || undefined,
        isFragile: Boolean(formData.isFragile),
        handlingNote: formData.handlingNote.trim() || undefined,
        labelWidth: Number(formData.labelWidth) || 100,
        labelHeight: Number(formData.labelHeight) || 150,
        notes: formData.notes.trim() || undefined,
      };

      if (shippingLabel) {
        await apiClient.patch(`/shipping-labels/${shippingLabel.id}`, payload);
      } else {
        await apiClient.post('/shipping-labels', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save shipping label');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={shippingLabel ? 'Edit Shipping Label' : 'Generate Shipping Label'}
        maxWidth="760px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Source Type Selector */}
            {!shippingLabel && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1F2839', marginBottom: '6px' }}>
                  Label Source *
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
                    { value: 'DO', label: 'From Issued Delivery Order', icon: <FileText size={16} /> },
                    { value: 'STANDALONE', label: 'Standalone Package Label', icon: <Truck size={16} /> },
                  ]}
                />
              </div>
            )}

            {/* Issued DO Selector (if DO mode) */}
            {sourceType === 'DO' && !shippingLabel && (
              <div style={{ marginBottom: '1rem' }}>
                <FormField label="Select Issued Delivery Order" required>
                  <Select
                    required
                    value={selectedDoId}
                    onChange={(e) => handleDoSelect(e.target.value)}
                  >
                    <option value="">Choose an Issued Delivery Order...</option>
                    {issuedDos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.doNumber} — {d.client?.name || d.clientCompanyName} ({d.project?.name || d.projectName})
                      </option>
                    ))}
                  </Select>
                </FormField>

                {selectedDoObj && (
                  <ProjectSnapshotCard
                    clientName={selectedDoObj.client?.name || selectedDoObj.clientCompanyName}
                    clientType={selectedDoObj.client?.clientType || selectedDoObj.clientType}
                    attnName={selectedDoObj.attnName || selectedDoObj.project?.clientContact?.name}
                    attnPhone={selectedDoObj.attnPhone || selectedDoObj.project?.clientContact?.phone}
                    projectName={selectedDoObj.projectName || selectedDoObj.project?.name}
                    referenceNumber={selectedDoObj.referenceNumber || selectedDoObj.project?.referenceNumber}
                    projectLocation={selectedDoObj.projectLocation || selectedDoObj.project?.location}
                    siteCode={selectedDoObj.siteCode || selectedDoObj.project?.siteCode}
                  />
                )}
              </div>
            )}

            {/* Recipient & Destination Details */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 14px', backgroundColor: '#FFFFFF', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={15} color="#2250A1" /> Recipient &amp; Destination Details
              </h4>

              <div className="form-grid">
                <FormField label="Recipient / Company" required>
                  <Input
                    ref={recipientInputRef}
                    placeholder="e.g. PT Pertamina Hulu Mahakam"
                    required
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  />
                </FormField>

                <FormField label="Attn / Recipient Name">
                  <Input
                    placeholder="e.g. Budi Santoso (0812-345678)"
                    value={formData.attnName}
                    onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="Destination / Site Address" required>
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
                    placeholder="e.g. PO-PHM-2026-001"
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

            {/* Sender Details (Auto-defaults from PT ALSSA Corporindo Identity) */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 14px', backgroundColor: '#F8FAFC', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                  Sender Dispatch Office (PT ALSSA Corporindo)
                </h4>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const idt = getCompanyIdentity('BPN');
                      setFormData((prev) => ({
                        ...prev,
                        senderName: idt.companyName,
                        senderAddress: idt.address,
                        senderPhone: idt.phone,
                      }));
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    Set Balikpapan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idt = getCompanyIdentity('JKT');
                      setFormData((prev) => ({
                        ...prev,
                        senderName: idt.companyName,
                        senderAddress: idt.address,
                        senderPhone: idt.phone,
                      }));
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#334155',
                    }}
                  >
                    Set Jakarta
                  </button>
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

            {/* Handling, Fragile & Dimensions */}
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <div>
                <FormField label="Ship Date" required>
                  <Input
                    type="date"
                    required
                    value={formData.shipDate}
                    onChange={(e) => setFormData({ ...formData, shipDate: e.target.value })}
                  />
                </FormField>

                <FormField label="Fragile Package?">
                  <SegmentedControl<string>
                    value={formData.isFragile ? 'YES' : 'NO'}
                    onChange={(val) => setFormData({ ...formData, isFragile: val === 'YES' })}
                    options={[
                      { value: 'NO', label: 'Standard Package' },
                      { value: 'YES', label: '⚠️ FRAGILE / HANDLE WITH CARE' },
                    ]}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Handling Notes">
                  <Input
                    placeholder="e.g. KEEP DRY, THIS SIDE UP, DO NOT DROP"
                    value={formData.handlingNote}
                    onChange={(e) => setFormData({ ...formData, handlingNote: e.target.value.toUpperCase() })}
                  />
                </FormField>

                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <FormField label="Label Width (mm)" style={{ marginBottom: 0 }}>
                    <Input
                      type="number"
                      min={50}
                      max={300}
                      value={formData.labelWidth}
                      onChange={(e) => setFormData({ ...formData, labelWidth: parseInt(e.target.value, 10) || 100 })}
                    />
                  </FormField>

                  <FormField label="Label Height (mm)" style={{ marginBottom: 0 }}>
                    <Input
                      type="number"
                      min={50}
                      max={400}
                      value={formData.labelHeight}
                      onChange={(e) => setFormData({ ...formData, labelHeight: parseInt(e.target.value, 10) || 150 })}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <FormField label="Internal Logistics Notes" style={{ marginBottom: 0 }}>
              <Textarea
                placeholder="e.g. Courier: JNE Trucking, 3 boxes total..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </FormField>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {shippingLabel ? 'Save Changes' : 'Generate Shipping Label'}
            </Button>
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
        message="You have unsaved changes in this shipping label form. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        variant="danger"
      />
    </>
  );
};

export default ShippingLabelFormModal;

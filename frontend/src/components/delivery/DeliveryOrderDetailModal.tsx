import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, StatusBadge, ConfirmModal } from '../ui/index.js';
import { DeliveryOrderPrintView } from './DeliveryOrderPrintView.js';
import { apiClient } from '../../api/client.js';
import { formatDateTime } from '../../utils/datetime.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Calendar,
  Building,
  FileText,
  Warehouse as WarehouseIcon,
  Printer,
  Download,
  Loader2,
  Edit2,
  Trash2,
  Send,
} from 'lucide-react';
import { generateDoPdfFilename, downloadDeliveryOrderPdf } from '../../utils/deliveryOrderPdf.js';
import { useAuth } from '../../context/AuthContext.js';
import { canManageDeliveries } from '../../utils/permissions.js';

export interface DeliveryOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryOrderId: number | null;
  onEditDraft?: (id: number) => void;
  onDraftCancelled?: () => void;
  onIssuedSuccess?: () => void;
}

export const DeliveryOrderDetailModal: React.FC<DeliveryOrderDetailModalProps> = ({
  isOpen,
  onClose,
  deliveryOrderId,
  onEditDraft,
  onDraftCancelled,
  onIssuedSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [deliveryOrder, setDeliveryOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Success dialog after issuing DO
  const [showIssueSuccess, setShowIssueSuccess] = useState(false);

  // Hidden print container
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!deliveryOrderId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
      setDeliveryOrder(data);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to load Delivery Order details';
      setErrorMsg(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && deliveryOrderId) {
      fetchDetail();
    }
  }, [isOpen, deliveryOrderId]);

  if (!isOpen) return null;

  const isDraft = deliveryOrder?.status === 'DRAFT';
  const isIssued = deliveryOrder?.status === 'ISSUED';

  const handleIssue = () => {
    if (!deliveryOrder) return;
    setErrorMsg(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Issue Delivery Order',
      message: `Are you sure you want to issue this Delivery Order? This will generate the official DO number and finalize the document snapshot. This action is irreversible.`,
      confirmText: 'Issue Delivery Order',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.post(`/delivery-orders/${deliveryOrder.id}/issue`);
          await fetchDetail();
          setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }));
          setShowIssueSuccess(true);
          showToast({
            type: 'success',
            message: 'Delivery Order issued successfully',
          });
          if (onIssuedSuccess) onIssuedSuccess();
        } catch (err: any) {
          const msg = err.message || 'Failed to issue Delivery Order';
          setErrorMsg(msg);
          showToast({ type: 'error', message: msg });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleCancelDraft = () => {
    if (!deliveryOrder) return;
    setErrorMsg(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel & Delete Draft',
      message: `Are you sure you want to cancel and delete Delivery Order Draft #${deliveryOrder.id}?`,
      confirmText: 'Delete Draft',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.delete(`/delivery-orders/${deliveryOrder.id}/draft`);
          setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }));
          showToast({
            type: 'success',
            message: 'Delivery Order draft cancelled',
          });
          onClose();
          if (onDraftCancelled) onDraftCancelled();
        } catch (err: any) {
          const msg = err.message || 'Failed to cancel draft';
          setErrorMsg(msg);
          showToast({ type: 'error', message: msg });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handlePrint = () => {
    if (!deliveryOrder) return;
    window.open(`/delivery-orders/${deliveryOrder.id}/print`, '_blank');
  };

  const handleDownloadPdf = async () => {
    if (!deliveryOrder || !printContainerRef.current) return;
    setIsDownloadingPdf(true);
    setPdfError(null);
    try {
      const filename = generateDoPdfFilename(deliveryOrder.doNumber, deliveryOrder.id);
      await downloadDeliveryOrderPdf(printContainerRef.current, filename);
      try {
        await apiClient.post(`/delivery-orders/${deliveryOrder.id}/print`);
      } catch (err) {
        console.warn('Failed to log print audit:', err);
      }
      showToast({
        type: 'success',
        message: 'PDF downloaded successfully',
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      const msg = err.message || 'Failed to generate PDF file. Please try browser Print.';
      setPdfError(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const clientName = deliveryOrder?.clientCompanyName || deliveryOrder?.client?.name || '—';
  const clientType = deliveryOrder?.clientType || deliveryOrder?.client?.clientType || 'OTHER';
  const attnName = deliveryOrder?.attnName || deliveryOrder?.project?.clientContact?.name || '—';
  const projectName = deliveryOrder?.projectName || deliveryOrder?.project?.name || '—';
  const siteCode = deliveryOrder?.siteCode || deliveryOrder?.project?.siteCode;
  const location = deliveryOrder?.projectLocation || deliveryOrder?.project?.location || '—';
  const refNumber = deliveryOrder?.referenceNumber || deliveryOrder?.project?.referenceNumber || '—';
  const ptsNumber = deliveryOrder?.ptsNumber || deliveryOrder?.stockMovement?.ptsNumber || deliveryOrder?.snapshots?.ptsNumber || null;
  const warehouseName = deliveryOrder?.warehouseName || deliveryOrder?.sourceWarehouse?.name || '—';
  const cityCode = deliveryOrder?.warehouseCityCode || deliveryOrder?.sourceWarehouse?.cityCode || '—';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Delivery Order — ${deliveryOrder?.doNumber || `Draft #${deliveryOrderId}`}`}
        maxWidth="850px"
      >
        <Modal.Body>
          {errorMsg && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          {isLoading || !deliveryOrder ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary, #6B7280)' }}>
              Loading Delivery Order details...
            </div>
          ) : (
            <div className="do-modal-content-stack">
              {/* Header info card */}
              <div className="do-metadata-card">
                <div>
                  <div className="do-field-label">Document Status</div>
                  <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <StatusBadge status={deliveryOrder.status} />
                    {isIssued && (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        ✓ Stock Decremented
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="do-field-label">
                    <Calendar size={13} /> DO Date &amp; Time
                  </div>
                  <div className="do-field-value">
                    {formatDateTime(deliveryOrder.date, cityCode || warehouseName)}
                  </div>
                </div>

                <div>
                  <div className="do-field-label">
                    <Building size={13} /> Client / Company
                  </div>
                  <div className="do-field-value">
                    {clientName}{' '}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: clientType === 'PHM' ? 'rgba(34, 80, 161, 0.1)' : 'var(--accent-secondary-bg, #E5E7EB)',
                        color: clientType === 'PHM' ? 'var(--primary-color, #2250A1)' : 'var(--text-secondary, #4B5563)',
                        fontWeight: 700,
                      }}
                    >
                      {clientType}
                    </span>
                  </div>
                  <div className="do-field-meta">
                    Attn: {attnName}
                  </div>
                </div>

                <div>
                  <div className="do-field-label">
                    <WarehouseIcon size={13} /> Source Warehouse
                  </div>
                  <div className="do-field-value">
                    {warehouseName} {cityCode && cityCode !== '—' ? `(${cityCode})` : ''}
                  </div>
                </div>

                <div>
                  <div className="do-field-label">
                    <FileText size={13} /> Project &amp; Site
                  </div>
                  <div className="do-field-value">
                    {projectName}
                  </div>
                  {siteCode && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-color, #2250A1)', fontWeight: 600 }}>
                      Code: {siteCode}
                    </div>
                  )}
                  <div className="do-field-meta">
                    Loc: {location}
                  </div>
                </div>

                <div>
                  <div className="do-field-label">References</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary, #1F2839)', marginTop: '2px' }}>
                    Ref: <strong>{refNumber}</strong>
                  </div>
                  {ptsNumber && (
                    <div style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 600 }}>
                      PTS: {ptsNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Activity & Notes */}
              <div className="do-activity-notes-grid">
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary, #4B5563)' }}>Activity Type:</span>
                  <div style={{ marginTop: '2px', fontWeight: 600, color: 'var(--text-primary, #1F2839)' }}>
                    {deliveryOrder.activity || 'General Dispatch'}
                  </div>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary, #4B5563)' }}>Notes / Purpose:</span>
                  <div style={{ marginTop: '2px', color: 'var(--text-primary, #1F2839)', whiteSpace: 'pre-wrap' }}>
                    {deliveryOrder.notes || '—'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-primary, #1F2839)' }}>
                  Dispatched Items ({deliveryOrder.items?.length || 0})
                </h4>
                <div className="do-table-container">
                  <table className="do-items-table">
                    <thead>
                      <tr>
                        <th className="do-items-table-th">Item</th>
                        <th className="do-items-table-th">Type</th>
                        <th className="do-items-table-th">Quantity</th>
                        <th className="do-items-table-th">PIC / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(deliveryOrder.items || []).map((it: any, idx: number) => {
                        const isSer = it.item?.trackingType === 'SERIALIZED' || it.trackingType === 'SERIALIZED';
                        const serials: string[] = it.serials || (it.itemSerials || []).map((is: any) => is.itemSerial?.serialNumber || is.serialNumber);

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td className="do-items-table-td">
                              <div style={{ fontWeight: 600, color: 'var(--text-primary, #1F2839)' }}>
                                {it.itemName || it.item?.name || 'Item'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #6B7280)' }}>
                                {[it.brand || it.item?.brand, it.modelNumber || it.item?.modelNumber].filter(Boolean).join(' • ')}
                              </div>
                              {isSer && serials && serials.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                  {serials.map((sn, sIdx) => (
                                    <span
                                      key={sIdx}
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.725rem',
                                        fontWeight: 600,
                                        padding: '1px 5px',
                                        backgroundColor: 'var(--accent-secondary-bg, #F3F4F6)',
                                        border: '1px solid var(--card-border, #E5E7EB)',
                                        borderRadius: '3px',
                                        color: 'var(--text-primary, #1F2839)',
                                      }}
                                    >
                                      {sn}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="do-items-table-td">
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontWeight: 600,
                                  backgroundColor: isSer ? 'rgba(126, 34, 206, 0.1)' : 'rgba(3, 105, 161, 0.1)',
                                  color: isSer ? '#7E22CE' : '#0369A1',
                                }}
                              >
                                {isSer ? 'SERIALIZED' : 'BULK'}
                              </span>
                            </td>
                            <td className="do-items-table-td" style={{ fontWeight: 600, color: 'var(--text-primary, #1F2839)' }}>
                              {it.quantity} {it.unitSymbol || it.unit || it.item?.unit?.symbol || 'pcs'}
                            </td>
                            <td className="do-items-table-td" style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #4B5563)' }}>
                              {it.pic && <div>PIC: {it.pic}</div>}
                              {it.remarks && <div>Remarks: {it.remarks}</div>}
                              {!it.pic && !it.remarks && <span style={{ color: '#9CA3AF' }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Metadata audit footer */}
              <div className="do-audit-footer">
                <div>
                  Created: {formatDateTime(deliveryOrder.createdAt, cityCode || warehouseName)}
                  {deliveryOrder.createdBy && ` by ${deliveryOrder.createdBy.name}`}
                </div>
                {deliveryOrder.issuedAt && (
                  <div>
                    Issued: {formatDateTime(deliveryOrder.issuedAt, cityCode || warehouseName)}
                    {deliveryOrder.issuedBy && ` by ${deliveryOrder.issuedBy.name}`}
                  </div>
                )}
              </div>

              {/* Hidden Print Document Wrapper for PDF Generation */}
              <div className="do-offscreen-print">
                <div ref={printContainerRef}>
                  <DeliveryOrderPrintView deliveryOrder={deliveryOrder} />
                </div>
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isDraft && canManageDeliveries(user?.role) && (
                <Button
                  variant="ghost"
                  onClick={handleCancelDraft}
                  style={{ color: '#EF4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} /> Cancel Draft
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isDraft && canManageDeliveries(user?.role) && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onClose();
                      if (onEditDraft) onEditDraft(deliveryOrder.id);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={14} /> Edit Draft
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleIssue}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#059669' }}
                  >
                    <Send size={14} /> Issue Delivery Order
                  </Button>
                </>
              )}

              {isIssued && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {pdfError && (
                    <span style={{ fontSize: '0.8rem', color: '#DC2626', marginRight: '4px' }}>
                      {pdfError}
                    </span>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handlePrint}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={15} /> Print (A4)
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isDownloadingPdf}
                    onClick={handleDownloadPdf}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="animate-spin" size={15} /> Preparing PDF...
                      </>
                    ) : (
                      <>
                        <Download size={15} /> Download PDF
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={isProcessing}
      />

      {/* DO Issue Success Action Modal (Rules 26 & 27) */}
      <Modal
        isOpen={showIssueSuccess}
        onClose={() => setShowIssueSuccess(false)}
        title="Delivery Order Issued Successfully"
        maxWidth="500px"
      >
        <Modal.Body style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div className="do-success-icon-wrapper">
            <Send size={28} />
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-primary, #1E293B)' }}>
            Official DO Number Generated
          </h3>

          <div className="do-success-number-pill">
            {deliveryOrder?.doNumber || 'DO Issued'}
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748B)', margin: 0 }}>
            Warehouse stocks have been decremented and serialized assets relocated to the project. Choose an option below:
          </p>
        </Modal.Body>

        <Modal.Footer>
          <div className="do-footer-wrapper">
            <Button variant="secondary" onClick={() => setShowIssueSuccess(false)}>
              Close
            </Button>

            <div className="do-footer-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowIssueSuccess(false);
                  handlePrint();
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Now
              </Button>
              <Button
                variant="primary"
                disabled={isDownloadingPdf}
                onClick={async () => {
                  await handleDownloadPdf();
                  setShowIssueSuccess(false);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="animate-spin" size={15} /> Preparing PDF...
                  </>
                ) : (
                  <>
                    <Download size={15} /> Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DeliveryOrderDetailModal;

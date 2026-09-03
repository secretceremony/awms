import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, StatusBadge, ConfirmModal } from '../ui/index.js';
import { DeliveryOrderPrintView } from './DeliveryOrderPrintView.js';
import { apiClient } from '../../api/client.js';
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
  const [showIssueSuccess, setShowIssueSuccess] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);

  const fetchDetail = async () => {
    if (!deliveryOrderId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
      setDeliveryOrder(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load Delivery Order details');
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
      message: `Are you sure you want to issue this Delivery Order? This will generate the official DO number, decrement source warehouse stock, relocate serialized assets to the project, and create an OUTGOING stock movement. This action is irreversible.`,
      confirmText: 'Issue Delivery Order',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.post(`/delivery-orders/${deliveryOrder.id}/issue`);
          await fetchDetail();
          setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }));
          setShowIssueSuccess(true);
          if (onIssuedSuccess) onIssuedSuccess();
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to issue Delivery Order');
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
          onClose();
          if (onDraftCancelled) onDraftCancelled();
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to cancel draft');
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
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err.message || 'Failed to generate PDF file. Please try browser Print.');
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
  const warehouseName = deliveryOrder?.warehouseName || deliveryOrder?.sourceWarehouse?.name || '—';
  const cityCode = deliveryOrder?.warehouseCityCode || deliveryOrder?.sourceWarehouse?.cityCode || '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delivery Order — ${deliveryOrder?.doNumber || `Draft #${deliveryOrderId}`}`}
      maxWidth="850px"
    >
      <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        {errorMsg && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {isLoading || !deliveryOrder ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
            Loading Delivery Order details...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Document Status</div>
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
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> DO Date
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {new Date(deliveryOrder.date).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={13} /> Client / Company
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {clientName}{' '}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      backgroundColor: clientType === 'PHM' ? 'rgba(34, 80, 161, 0.1)' : '#E5E7EB',
                      color: clientType === 'PHM' ? '#2250A1' : '#4B5563',
                      fontWeight: 700,
                    }}
                  >
                    {clientType}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Attn: {attnName}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={13} /> Project & Reference
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {projectName} {siteCode ? `[${siteCode}]` : ''}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  {location}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#2250A1', fontFamily: 'monospace', fontWeight: 700 }}>
                  Ref: {refNumber}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <WarehouseIcon size={13} /> Source Warehouse
                </div>
                <div style={{ fontWeight: 600, color: '#2250A1', marginTop: '2px' }}>
                  {warehouseName} [{cityCode}]
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Activity</div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {deliveryOrder.activity}
                </div>
              </div>
            </div>

            {/* Notes if present */}
            {deliveryOrder.notes && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '6px', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: '#1E40AF' }}>Notes: </span>
                <span style={{ color: '#1E3A8A' }}>{deliveryOrder.notes}</span>
              </div>
            )}

            {/* Items Table */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1F2839', marginBottom: '0.5rem' }}>
                Dispatched Items ({deliveryOrder.items?.length || 0})
              </div>

              <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Item / Brand</th>
                      <th>Model Number</th>
                      <th>Type</th>
                      <th>Serial Numbers</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>PIC</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deliveryOrder.items || []).map((item: any) => {
                      const snList = (item.itemSerials || []).map(
                        (s: any) => s.serialNumber || s.itemSerial?.serialNumber,
                      );

                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1F2839' }}>
                              {item.itemName || item.item?.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              {item.brand || item.item?.brand || '—'}
                            </div>
                          </td>
                          <td>{item.modelNumber || item.item?.modelNumber || '—'}</td>
                          <td>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: (item.trackingType || item.item?.trackingType) === 'BULK' ? '#047857' : '#2250A1',
                              }}
                            >
                              {item.trackingType || item.item?.trackingType}
                            </span>
                          </td>
                          <td>
                            {snList.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {snList.map((sn: string, idx: number) => (
                                  <span
                                    key={idx}
                                    style={{
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      fontFamily: 'monospace',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      backgroundColor: 'rgba(34, 80, 161, 0.08)',
                                      color: '#2250A1',
                                    }}
                                  >
                                    {sn}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                          <td>{item.unitSymbol || item.item?.unit?.symbol || item.unitName || item.item?.unit?.name || 'pcs'}</td>
                          <td>{item.pic || '—'}</td>
                          <td>{item.remarks || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hidden Print Container for native window print */}
            <div style={{ display: 'none' }}>
              <div ref={printContainerRef}>
                <DeliveryOrderPrintView deliveryOrder={deliveryOrder} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {isDraft && (
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
          {isDraft && (
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
        <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              marginBottom: '1rem',
            }}
          >
            <Send size={28} />
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#1E293B' }}>
            Official DO Number Generated
          </h3>

          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '1rem',
              fontWeight: 700,
              backgroundColor: '#EFF6FF',
              color: '#2250A1',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #BFDBFE',
              display: 'inline-block',
              marginBottom: '1rem',
            }}
          >
            {deliveryOrder?.doNumber || 'DO Issued'}
          </div>

          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
            Warehouse stocks have been decremented and serialized assets relocated to the project. Choose an option below:
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => setShowIssueSuccess(false)}>
            Close
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
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
      </Modal>
    </Modal>
  );
};

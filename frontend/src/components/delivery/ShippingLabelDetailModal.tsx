import React, { useRef, useState } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Printer, Download, Loader2, AlertTriangle } from 'lucide-react';
import type { ShippingLabel } from './ShippingLabelFormModal.js';
import { ShippingLabelPrintView } from './ShippingLabelPrintView.js';
import {
  downloadShippingLabelPdf,
  generateShippingLabelFilename,
} from '../../utils/shippingLabelPdf.js';

export interface ShippingLabelDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shippingLabel: ShippingLabel | null;
}

export const ShippingLabelDetailModal: React.FC<ShippingLabelDetailModalProps> = ({
  isOpen,
  onClose,
  shippingLabel,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  if (!shippingLabel) return null;

  const handlePrint = async () => {
    try {
      await apiClient.post(`/shipping-labels/${shippingLabel.id}/print`);
    } catch (err) {
      console.warn('Failed to record print audit:', err);
    }

    const printContents = printContainerRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open('', '_blank', 'width=850,height=650');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Label - ${shippingLabel.recipientName}</title>
            <style>
              @page {
                size: 150mm 100mm landscape;
                margin: 0;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #FFFFFF;
                color: #000000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .shipping-label-container {
                width: 150mm !important;
                height: 100mm !important;
                margin: 0 auto;
                page-break-after: always;
                break-after: page;
              }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    setIsPdfGenerating(true);
    try {
      const filename = generateShippingLabelFilename(shippingLabel);
      await downloadShippingLabelPdf(printContainerRef.current, filename);
    } catch (err) {
      console.error('Failed to generate shipping label PDF:', err);
      alert('Failed to generate PDF. Please try printing directly.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shipping Label Document Preview" maxWidth="720px">
      <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
        {/* Fragile Warning Notice */}
        {shippingLabel.isFragile && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#B91C1C',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            <AlertTriangle size={20} />
            <div>
              <span>⚠️ FRAGILE / HANDLE WITH CARE</span>
              {shippingLabel.handlingNote && (
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991B1B', marginLeft: '8px' }}>
                  ({shippingLabel.handlingNote})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live Document Preview Box */}
        <div
          style={{
            backgroundColor: '#F1F5F9',
            padding: '1.25rem',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflowX: 'auto',
            marginBottom: '1rem',
          }}
        >
          <div
            ref={printContainerRef}
            style={{
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <ShippingLabelPrintView label={shippingLabel} />
          </div>
        </div>

        {/* Metadata Details Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
            gap: '8px',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 10px', backgroundColor: '#F8FAFC' }}>
            <span style={{ color: '#64748B', fontSize: '0.7rem' }}>Ship Date:</span>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>
              {new Date(shippingLabel.shipDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 10px', backgroundColor: '#F8FAFC' }}>
            <span style={{ color: '#64748B', fontSize: '0.7rem' }}>Source:</span>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>
              {shippingLabel.sourceType === 'DO' ? 'Delivery Order' : 'Standalone'}
            </div>
          </div>

          {shippingLabel.doNumber && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 10px', backgroundColor: '#F8FAFC' }}>
              <span style={{ color: '#64748B', fontSize: '0.7rem' }}>DO Number:</span>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1' }}>
                {shippingLabel.doNumber}
              </div>
            </div>
          )}

          {shippingLabel.referenceNumber && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 10px', backgroundColor: '#F8FAFC' }}>
              <span style={{ color: '#64748B', fontSize: '0.7rem' }}>Reference No:</span>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                {shippingLabel.referenceNumber}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isPdfGenerating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isPdfGenerating ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={16} /> Print (150x100mm)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShippingLabelDetailModal;

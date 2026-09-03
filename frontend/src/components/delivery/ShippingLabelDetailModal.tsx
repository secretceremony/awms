import React, { useRef } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Printer, AlertTriangle } from 'lucide-react';
import type { ShippingLabel } from './ShippingLabelFormModal.js';

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

  if (!shippingLabel) return null;

  const handlePrint = async () => {
    try {
      await apiClient.post(`/shipping-labels/${shippingLabel.id}/print`);
    } catch (err) {
      console.warn('Failed to record print audit:', err);
    }

    const printContents = printContainerRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Label - ${shippingLabel.recipientName}</title>
            <style>
              @page {
                size: ${shippingLabel.labelWidth || 100}mm ${shippingLabel.labelHeight || 150}mm;
                margin: 6mm;
              }
              * {
                box-sizing: border-box;
              }
              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #000000;
                background-color: #FFFFFF;
                margin: 0;
                padding: 0;
                font-size: 10pt;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .label-card {
                border: 2px solid #000000;
                padding: 10px;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .header-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #000000;
                padding-bottom: 6px;
                margin-bottom: 8px;
              }
              .company-title {
                font-size: 11pt;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .fragile-banner {
                background-color: #000000 !important;
                color: #FFFFFF !important;
                font-size: 14pt;
                font-weight: 900;
                text-align: center;
                padding: 4px;
                margin: 6px 0;
                letter-spacing: 1px;
                border: 1px solid #000000;
              }
              .section-box {
                border: 1.5px solid #000000;
                padding: 6px 8px;
                margin-bottom: 6px;
              }
              .section-label {
                font-size: 8pt;
                font-weight: bold;
                text-transform: uppercase;
                color: #333333;
                margin-bottom: 2px;
              }
              .recipient-name {
                font-size: 13pt;
                font-weight: 900;
                color: #000000;
              }
              .destination-text {
                font-size: 11pt;
                font-weight: bold;
                line-height: 1.3;
                margin-top: 2px;
              }
              .meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                font-size: 9pt;
              }
              .meta-item {
                border: 1px solid #000000;
                padding: 4px 6px;
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shipping Label Details" maxWidth="680px">
      <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
        {/* Fragile Warning Banner */}
        {shippingLabel.isFragile && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              borderRadius: '6px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#B91C1C',
              fontWeight: 700,
              fontSize: '0.95rem',
              marginBottom: '1rem',
            }}
          >
            <AlertTriangle size={22} />
            <div>
              <div>⚠️ FRAGILE PACKAGE / HANDLE WITH CARE</div>
              {shippingLabel.handlingNote && (
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991B1B', marginTop: '2px' }}>
                  Note: {shippingLabel.handlingNote}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recipient & Destination Preview */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Ship To / Recipient
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>
            {shippingLabel.recipientName}
          </div>
          {shippingLabel.attnName && (
            <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
              Attn: {shippingLabel.attnName}
            </div>
          )}
          <div style={{ fontSize: '0.95rem', color: '#1E293B', fontWeight: 600, marginTop: '4px' }}>
            📍 {shippingLabel.destination}
          </div>
        </div>

        {/* Reference & DO details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
            gap: '10px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px' }}>
            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Ship Date:</span>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>
              {new Date(shippingLabel.shipDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px' }}>
            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Source:</span>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>
              {shippingLabel.sourceType === 'DO' ? 'From Delivery Order' : 'Standalone'}
            </div>
          </div>

          {shippingLabel.doNumber && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px' }}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>DO Number:</span>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1' }}>
                {shippingLabel.doNumber}
              </div>
            </div>
          )}

          {shippingLabel.referenceNumber && (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 12px' }}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Reference No:</span>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                {shippingLabel.referenceNumber}
              </div>
            </div>
          )}
        </div>

        {/* Sender Information */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 12px', backgroundColor: '#F9FAFB', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Sender Information
          </span>
          <div style={{ fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
            {shippingLabel.senderName || 'PT ALSSA Corporindo'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
            {shippingLabel.senderAddress}
          </div>
          {shippingLabel.senderPhone && (
            <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
              Telp: {shippingLabel.senderPhone}
            </div>
          )}
        </div>

        {/* Label Dimensions & Notes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B' }}>
          <div>
            Size: <strong>{shippingLabel.labelWidth || 100}mm × {shippingLabel.labelHeight || 150}mm</strong>
          </div>
          <div>
            Created By: <strong>{shippingLabel.createdBy?.name || 'Admin'}</strong>
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={handlePrint}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Printer size={16} /> Print Shipping Label
        </Button>
      </div>

      {/* Hidden Container for Label Print DOM */}
      <div style={{ display: 'none' }}>
        <div ref={printContainerRef}>
          <div className="label-card">
            {/* Header / Logo */}
            <div className="header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/alssa-logo.png"
                  alt="PT ALSSA Corporindo"
                  style={{ height: '34px', maxWidth: '160px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <div className="company-title">{shippingLabel.senderName || 'PT ALSSA CORPORINDO'}</div>
                  <div style={{ fontSize: '7.5pt', color: '#333333' }}>
                    {shippingLabel.senderAddress || 'Rukan Tanjung Mas Raya, Jl. Raya Lenteng Agung Blok B1 No. 3, Jakarta Selatan'} {shippingLabel.senderPhone ? `| Telp: ${shippingLabel.senderPhone}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '8.5pt' }}>
                SHIPPING LABEL
              </div>
            </div>

            {/* Fragile Banner if applicable */}
            {shippingLabel.isFragile && (
              <div className="fragile-banner">
                ⚠️ FRAGILE / HANDLE WITH CARE
              </div>
            )}

            {/* Recipient Section */}
            <div className="section-box" style={{ flexGrow: 1 }}>
              <div className="section-label">SHIP TO / RECIPIENT:</div>
              <div className="recipient-name">{shippingLabel.recipientName}</div>
              {shippingLabel.attnName && (
                <div style={{ fontSize: '10pt', fontWeight: 'bold', marginTop: '2px' }}>
                  ATTN: {shippingLabel.attnName}
                </div>
              )}
              <div className="destination-text">
                DESTINATION: {shippingLabel.destination}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="meta-grid">
              <div className="meta-item">
                <div className="section-label">SHIP DATE:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {new Date(shippingLabel.shipDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div className="meta-item">
                <div className="section-label">REFERENCE NO:</div>
                <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                  {shippingLabel.referenceNumber || 'N/A'}
                </div>
              </div>

              {shippingLabel.doNumber && (
                <div className="meta-item" style={{ gridColumn: 'span 2' }}>
                  <div className="section-label">DELIVERY ORDER NO:</div>
                  <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '10pt' }}>
                    {shippingLabel.doNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Handling note & Footer */}
            {shippingLabel.handlingNote && (
              <div style={{ border: '1px solid #000000', padding: '4px', marginTop: '6px', fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center' }}>
                HANDLING: {shippingLabel.handlingNote}
              </div>
            )}

            <div style={{ fontSize: '7pt', color: '#555555', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>PT ALSSA Corporindo</span>
              <span>Doc #{shippingLabel.id}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ShippingLabelDetailModal;

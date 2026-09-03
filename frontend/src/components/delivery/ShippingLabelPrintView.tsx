import React from 'react';
import type { ShippingLabel } from './ShippingLabelFormModal.js';

export interface ShippingLabelPrintViewProps {
  label: ShippingLabel;
  className?: string;
  style?: React.CSSProperties;
}

export const ShippingLabelPrintView: React.FC<ShippingLabelPrintViewProps> = ({
  label,
  className = '',
  style = {},
}) => {
  const formattedDate = label.shipDate
    ? new Date(label.shipDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  return (
    <div
      className={`shipping-label-container ${className}`}
      style={{
        width: '150mm',
        minHeight: '100mm',
        maxHeight: '100mm',
        height: '100mm',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        padding: '6mm 7mm',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
        border: '2.5px solid #000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        ...style,
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #000000',
          paddingBottom: '4px',
          marginBottom: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/alssa-logo.png"
            alt="PT ALSSA Corporindo"
            style={{ height: '30px', maxWidth: '140px', objectFit: 'contain' }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div
              style={{
                fontSize: '9pt',
                fontWeight: 900,
                letterSpacing: '0.4px',
                lineHeight: 1.1,
                textTransform: 'uppercase',
                color: '#000000',
              }}
            >
              PT ALSSA CORPORINDO
            </div>
            <div style={{ fontSize: '6.5pt', color: '#333333', lineHeight: 1.15, marginTop: '1px' }}>
              Logistics &amp; Supply Chain Dispatch
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '11pt',
              fontWeight: 900,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#000000',
              lineHeight: 1,
            }}
          >
            SHIPPING LABEL
          </div>
          <div style={{ fontSize: '7pt', fontWeight: 600, color: '#444444', marginTop: '2px' }}>
            DOC #{label.id}
          </div>
        </div>
      </div>

      {/* Fragile Warning Box */}
      {label.isFragile && (
        <div
          style={{
            border: '2.5px solid #DC2626',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            textAlign: 'center',
            padding: '4px 8px',
            marginBottom: '4px',
            borderRadius: '2px',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: '11pt',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              color: '#DC2626',
            }}
          >
            FRAGILE
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '7pt',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              marginTop: '1px',
              color: '#B91C1C',
            }}
          >
            HANDLE WITH CARE
          </div>
        </div>
      )}

      {/* 2-Column or Stacked Main Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
        {/* FROM (Sender) */}
        <div
          style={{
            border: '1px solid #000000',
            padding: '3px 6px',
            backgroundColor: '#FAFAFA',
            fontSize: '7.5pt',
            lineHeight: 1.25,
          }}
        >
          <div style={{ fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#555555' }}>
            FROM / SENDER:
          </div>
          <div style={{ fontWeight: 800, color: '#000000' }}>
            {label.senderName || 'PT ALSSA Corporindo'}
          </div>
          <div style={{ color: '#222222' }}>
            {label.senderAddress || 'Balikpapan Hub, Kalimantan Timur'}
          </div>
          {label.senderPhone && (
            <div style={{ color: '#333333', fontWeight: 600 }}>
              Telp: {label.senderPhone}
            </div>
          )}
        </div>

        {/* TO (Recipient) */}
        <div
          style={{
            border: '1.5px solid #000000',
            padding: '5px 7px',
            backgroundColor: '#FFFFFF',
            flexGrow: 1,
          }}
        >
          <div style={{ fontSize: '6.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#333333' }}>
            SHIP TO / RECIPIENT:
          </div>
          <div
            style={{
              fontSize: '11pt',
              fontWeight: 900,
              color: '#000000',
              lineHeight: 1.2,
              marginTop: '1px',
            }}
          >
            {label.recipientName}
          </div>
          {label.attnName && (
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#111111', marginTop: '2px' }}>
              ATTN: {label.attnName}
            </div>
          )}
          <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#222222', marginTop: '3px', lineHeight: 1.25 }}>
            DESTINATION / SITE: {label.destination}
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: label.doNumber ? '1.2fr 1fr 0.9fr' : '1.2fr 1fr',
            gap: '4px',
            fontSize: '7.5pt',
          }}
        >
          {label.doNumber && (
            <div style={{ border: '1px solid #000000', padding: '3px 5px', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#555555' }}>
                DELIVERY ORDER NO:
              </div>
              <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '8pt', color: '#000000' }}>
                {label.doNumber}
              </div>
            </div>
          )}

          <div style={{ border: '1px solid #000000', padding: '3px 5px', backgroundColor: '#F8FAFC' }}>
            <div style={{ fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#555555' }}>
              REFERENCE NO:
            </div>
            <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '7.5pt', color: '#000000' }}>
              {label.referenceNumber || '—'}
            </div>
          </div>

          <div style={{ border: '1px solid #000000', padding: '3px 5px', backgroundColor: '#F8FAFC' }}>
            <div style={{ fontSize: '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#555555' }}>
              SHIP DATE:
            </div>
            <div style={{ fontWeight: 800, fontSize: '7.5pt', color: '#000000' }}>
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Handling Note if present */}
        {label.handlingNote && (
          <div
            style={{
              border: '1px dashed #000000',
              padding: '2px 5px',
              fontSize: '7pt',
              fontWeight: 700,
              backgroundColor: '#FFFBEB',
              color: '#78350F',
            }}
          >
            NOTE: {label.handlingNote}
          </div>
        )}
      </div>

      {/* Clean Footer */}
      <div
        style={{
          borderTop: '1px solid #000000',
          paddingTop: '2px',
          marginTop: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '6pt',
          color: '#555555',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}
      >
        <span>PT ALSSA CORPORINDO • LOGISTICS DISPATCH</span>
        <span>ORIGINAL DOCUMENT</span>
      </div>
    </div>
  );
};

export default ShippingLabelPrintView;

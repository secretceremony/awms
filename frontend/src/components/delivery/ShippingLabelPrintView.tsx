import React from 'react';
import type { ShippingLabel } from './ShippingLabelFormModal.js';
import { formatDateTime } from '../../utils/datetime.js';

export interface ShippingLabelPrintViewProps {
  label: ShippingLabel;
  className?: string;
  style?: React.CSSProperties;
  size?: 'A6' | 'A5';
}

export const ShippingLabelPrintView: React.FC<ShippingLabelPrintViewProps> = ({
  label,
  className = '',
  style = {},
  size,
}) => {
  const isA5 = size === 'A5' || label.labelWidth >= 200 || label.labelHeight >= 140;
  
  // Dimensions
  const widthMm = isA5 ? '210mm' : '148mm';
  const heightMm = isA5 ? '148mm' : '105mm';

  const formattedDateTime = formatDateTime(label.shipDate, label.senderAddress || 'WITA');

  return (
    <div
      className={`shipping-label-container ${className}`}
      data-size={isA5 ? 'A5' : 'A6'}
      style={{
        width: widthMm,
        minHeight: heightMm,
        maxHeight: heightMm,
        height: heightMm,
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        padding: isA5 ? '8mm 10mm' : '5mm 7mm',
        fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
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
      {/* 1. FROM SECTION */}
      <div
        style={{
          border: '1.5px solid #000000',
          padding: isA5 ? '6px 10px' : '4px 8px',
          backgroundColor: '#F8FAFC',
          fontSize: isA5 ? '9pt' : '7.5pt',
          lineHeight: 1.25,
          marginBottom: isA5 ? '6px' : '4px',
        }}
      >
        <div style={{ fontSize: isA5 ? '7pt' : '6pt', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
          FROM / SENDER:
        </div>
        <div style={{ fontWeight: 900, color: '#000000', fontSize: isA5 ? '10pt' : '8.5pt' }}>
          {label.senderName || 'PT ALSSA Corporindo'}
        </div>
        <div style={{ color: '#334155' }}>
          {label.senderAddress || 'Balikpapan Hub, Kalimantan Timur'}
        </div>
        {label.senderPhone && (
          <div style={{ color: '#475569', fontWeight: 600 }}>
            Telp: {label.senderPhone}
          </div>
        )}
      </div>

      {/* 2. TO SECTION (Primary / Strongest Section) */}
      <div
        style={{
          border: '2px solid #000000',
          padding: isA5 ? '8px 12px' : '6px 10px',
          backgroundColor: '#FFFFFF',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginBottom: isA5 ? '6px' : '4px',
        }}
      >
        <div style={{ fontSize: isA5 ? '7.5pt' : '6.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.6px' }}>
          SHIP TO / RECIPIENT:
        </div>
        <div
          style={{
            fontSize: isA5 ? '14pt' : '11.5pt',
            fontWeight: 900,
            color: '#000000',
            lineHeight: 1.2,
            marginTop: '2px',
          }}
        >
          {label.recipientName}
        </div>
        {label.attnName && (
          <div style={{ fontSize: isA5 ? '10.5pt' : '8.5pt', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
            ATTN: {label.attnName}
          </div>
        )}
        <div style={{ fontSize: isA5 ? '10pt' : '8.5pt', fontWeight: 600, color: '#334155', marginTop: '3px', lineHeight: 1.25 }}>
          DESTINATION: {label.destination}
        </div>
      </div>

      {/* 3. METADATA GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: label.doNumber ? '1.2fr 1fr 1.1fr' : '1fr 1fr',
          gap: isA5 ? '6px' : '4px',
          fontSize: isA5 ? '8.5pt' : '7.5pt',
          marginBottom: isA5 ? '6px' : '4px',
        }}
      >
        {label.doNumber && (
          <div style={{ border: '1px solid #000000', padding: '3px 6px', backgroundColor: '#F8FAFC' }}>
            <div style={{ fontSize: isA5 ? '6.5pt' : '5.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
              DO NUMBER:
            </div>
            <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '9pt' : '7.5pt', color: '#000000' }}>
              {label.doNumber}
            </div>
          </div>
        )}

        <div style={{ border: '1px solid #000000', padding: '3px 6px', backgroundColor: '#F8FAFC' }}>
          <div style={{ fontSize: isA5 ? '6.5pt' : '5.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
            REFERENCE NO:
          </div>
          <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: isA5 ? '9pt' : '7.5pt', color: '#000000' }}>
            {label.referenceNumber || '—'}
          </div>
        </div>

        <div style={{ border: '1px solid #000000', padding: '3px 6px', backgroundColor: '#F8FAFC' }}>
          <div style={{ fontSize: isA5 ? '6.5pt' : '5.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
            DATE &amp; TIME:
          </div>
          <div style={{ fontWeight: 800, fontSize: isA5 ? '8.5pt' : '7pt', color: '#000000' }}>
            {formattedDateTime}
          </div>
        </div>
      </div>

      {/* 4. HANDLING NOTE IF PRESENT */}
      {label.handlingNote && (
        <div
          style={{
            border: '1px dashed #000000',
            padding: '2px 6px',
            fontSize: isA5 ? '8pt' : '7pt',
            fontWeight: 700,
            backgroundColor: '#FFFBEB',
            color: '#78350F',
            marginBottom: isA5 ? '6px' : '4px',
          }}
        >
          NOTE: {label.handlingNote}
        </div>
      )}

      {/* 5. FRAGILE WARNING BOX (CONDITIONAL) */}
      {label.isFragile && (
        <div
          style={{
            border: '2.5px solid #DC2626',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            textAlign: 'center',
            padding: isA5 ? '4px 8px' : '2px 6px',
            borderRadius: '2px',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '11pt' : '9.5pt',
              letterSpacing: '2px',
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
              fontSize: isA5 ? '7pt' : '6pt',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginTop: '1px',
              color: '#B91C1C',
            }}
          >
            HANDLE WITH CARE
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingLabelPrintView;

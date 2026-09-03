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

  // Physical Dimensions
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
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, Helvetica, sans-serif",
        border: '3px solid #000000',
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
      {/* 1. EQUAL-SIZED FROM & TO MAIN BOXES (50% / 50% Equal Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: isA5 ? '10px' : '6px',
          flexGrow: 1,
          marginBottom: isA5 ? '8px' : '5px',
        }}
      >
        {/* FROM BOX (Left 50%) */}
        <div
          style={{
            border: '2px solid #000000',
            borderRadius: '2px',
            padding: isA5 ? '8px 12px' : '6px 8px',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: isA5 ? '8.5pt' : '7pt',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#475569',
              letterSpacing: '0.8px',
              borderBottom: '1px solid #CBD5E1',
              paddingBottom: '2px',
              marginBottom: '4px',
            }}
          >
            FROM / SENDER
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '13pt' : '10.5pt',
              color: '#000000',
              lineHeight: 1.2,
            }}
          >
            {label.senderName || 'PT ALSSA CORPORINDO'}
          </div>
          <div
            style={{
              fontSize: isA5 ? '9.5pt' : '7.5pt',
              color: '#334155',
              marginTop: '4px',
              lineHeight: 1.3,
            }}
          >
            {label.senderAddress || 'Balikpapan Hub, Kalimantan Timur'}
          </div>
          {label.senderPhone && (
            <div
              style={{
                fontSize: isA5 ? '9pt' : '7.5pt',
                fontWeight: 700,
                color: '#1E293B',
                marginTop: 'auto',
                paddingTop: '4px',
              }}
            >
              TELP: {label.senderPhone}
            </div>
          )}
        </div>

        {/* TO BOX (Right 50%) */}
        <div
          style={{
            border: '2px solid #000000',
            borderRadius: '2px',
            padding: isA5 ? '8px 12px' : '6px 8px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: isA5 ? '8.5pt' : '7pt',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#1E293B',
              letterSpacing: '0.8px',
              borderBottom: '1px solid #94A3B8',
              paddingBottom: '2px',
              marginBottom: '4px',
            }}
          >
            SHIP TO / RECIPIENT
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '14pt' : '11.5pt',
              color: '#000000',
              lineHeight: 1.2,
            }}
          >
            {label.recipientName}
          </div>
          {label.attnName && (
            <div
              style={{
                fontSize: isA5 ? '10.5pt' : '8.5pt',
                fontWeight: 800,
                color: '#1E293B',
                marginTop: '3px',
              }}
            >
              ATTN: {label.attnName}
            </div>
          )}
          <div
            style={{
              fontSize: isA5 ? '10pt' : '8pt',
              fontWeight: 700,
              color: '#334155',
              marginTop: '4px',
              lineHeight: 1.25,
            }}
          >
            SITE: {label.destination}
          </div>
        </div>
      </div>

      {/* 2. SECONDARY METADATA ROW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: label.doNumber ? '1.2fr 1fr 1.1fr' : '1fr 1fr',
          gap: isA5 ? '8px' : '5px',
          fontSize: isA5 ? '9pt' : '7.5pt',
          marginBottom: isA5 ? '6px' : '4px',
        }}
      >
        {label.doNumber && (
          <div
            style={{
              border: '1.5px solid #000000',
              padding: isA5 ? '4px 8px' : '3px 6px',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ fontSize: isA5 ? '7pt' : '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
              DO NUMBER:
            </div>
            <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '10pt' : '8pt', color: '#000000' }}>
              {label.doNumber}
            </div>
          </div>
        )}

        <div
          style={{
            border: '1.5px solid #000000',
            padding: isA5 ? '4px 8px' : '3px 6px',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ fontSize: isA5 ? '7pt' : '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
            REFERENCE NO:
          </div>
          <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '10pt' : '8pt', color: '#000000' }}>
            {label.referenceNumber || '—'}
          </div>
        </div>

        <div
          style={{
            border: '1.5px solid #000000',
            padding: isA5 ? '4px 8px' : '3px 6px',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ fontSize: isA5 ? '7pt' : '6pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
            DATE &amp; TIME:
          </div>
          <div style={{ fontWeight: 900, fontSize: isA5 ? '9.5pt' : '7.5pt', color: '#000000' }}>
            {formattedDateTime}
          </div>
        </div>
      </div>

      {/* 3. HANDLING NOTE (IF PRESENT) */}
      {label.handlingNote && (
        <div
          style={{
            border: '1.5px dashed #000000',
            padding: isA5 ? '4px 8px' : '2px 6px',
            fontSize: isA5 ? '9pt' : '7.5pt',
            fontWeight: 800,
            backgroundColor: '#FFFBEB',
            color: '#78350F',
            marginBottom: isA5 ? '6px' : '4px',
          }}
        >
          NOTE: {label.handlingNote}
        </div>
      )}

      {/* 4. FRAGILE WARNING BOX (IF FRAGILE) */}
      {label.isFragile && (
        <div
          style={{
            border: '3px solid #DC2626',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            textAlign: 'center',
            padding: isA5 ? '5px 10px' : '3px 6px',
            borderRadius: '2px',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '12pt' : '10pt',
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
              fontSize: isA5 ? '8pt' : '6.5pt',
              letterSpacing: '1.2px',
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

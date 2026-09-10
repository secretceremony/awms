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

  // Physical Dimensions (Standard: 148mm x 105mm, Large: 210mm x 148mm)
  const widthMm = isA5 ? '210mm' : '148mm';
  const heightMm = isA5 ? '148mm' : '105mm';

  const formattedDateTime = formatDateTime(label.shipDate, label.senderAddress || 'WITA');

  return (
    <div
      className={`shipping-label-container ${className}`}
      data-size={isA5 ? 'A5' : 'A6'}
      style={{
        width: widthMm,
        minWidth: widthMm,
        maxWidth: widthMm,
        height: heightMm,
        minHeight: heightMm,
        maxHeight: heightMm,
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        padding: isA5 ? '6mm 8mm' : '4.5mm 5.5mm',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, Helvetica, sans-serif",
        border: '3px solid #000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        pageBreakInside: 'avoid',
        breakInside: 'avoid-page',
        margin: '0 auto',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        ...style,
      }}
    >
      {/* 1. TOP SECTION: SENDER & RECIPIENT GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40% 60%',
          gap: isA5 ? '8px' : '5px',
          flex: '1 1 auto',
          minHeight: 0,
          marginBottom: isA5 ? '5px' : '3px',
        }}
      >
        {/* FROM BOX (Left 40% - Compact Sender Information) */}
        <div
          style={{
            border: '1.5px solid #000000',
            borderRadius: '2px',
            padding: isA5 ? '6px 8px' : '4px 6px',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div>
            <div
              style={{
                fontSize: isA5 ? '7.5pt' : '6pt',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#475569',
                letterSpacing: '0.6px',
                borderBottom: '1px solid #CBD5E1',
                paddingBottom: '2px',
                marginBottom: '3px',
              }}
            >
              FROM / SENDER
            </div>
            <div
              style={{
                fontWeight: 900,
                fontSize: isA5 ? '10pt' : '8pt',
                color: '#000000',
                lineHeight: 1.15,
                wordBreak: 'break-word',
              }}
            >
              {label.senderName || 'PT ALSSA CORPORINDO'}
            </div>
            <div
              style={{
                fontSize: isA5 ? '8pt' : '6.5pt',
                color: '#334155',
                marginTop: '3px',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {label.senderAddress || 'Balikpapan Hub, Kalimantan Timur'}
            </div>
          </div>
          {label.senderPhone && (
            <div
              style={{
                fontSize: isA5 ? '7.5pt' : '6.5pt',
                fontWeight: 700,
                color: '#1E293B',
                marginTop: '3px',
                paddingTop: '2px',
                borderTop: '1px dashed #E2E8F0',
                lineHeight: 1.1,
              }}
            >
              TELP: {label.senderPhone}
            </div>
          )}
        </div>

        {/* TO BOX (Right 60% - Visually Prominent Recipient & Site) */}
        <div
          style={{
            border: '2px solid #000000',
            borderRadius: '2px',
            padding: isA5 ? '6px 10px' : '4px 7px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1.5px solid #000000',
              paddingBottom: '2px',
              marginBottom: '3px',
            }}
          >
            <span
              style={{
                fontSize: isA5 ? '8pt' : '6.5pt',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#1E293B',
                letterSpacing: '0.8px',
              }}
            >
              SHIP TO / RECIPIENT
            </span>
            {label.isFragile && (
              <span
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: isA5 ? '7pt' : '5.5pt',
                  letterSpacing: '0.8px',
                  padding: '1px 5px',
                  borderRadius: '2px',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                FRAGILE
              </span>
            )}
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '13pt' : '10.5pt',
              color: '#000000',
              lineHeight: 1.15,
              wordBreak: 'break-word',
            }}
          >
            {label.recipientName}
          </div>
          {label.attnName && (
            <div
              style={{
                fontSize: isA5 ? '9.5pt' : '7.5pt',
                fontWeight: 800,
                color: '#1E293B',
                marginTop: '2px',
                lineHeight: 1.15,
                wordBreak: 'break-word',
              }}
            >
              ATTN: {label.attnName}
            </div>
          )}
          <div
            style={{
              fontSize: isA5 ? '9.5pt' : '7.5pt',
              fontWeight: 700,
              color: '#0F172A',
              marginTop: '3px',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            <span style={{ fontWeight: 900, color: '#475569' }}>DESTINATION: </span>
            {label.destination}
          </div>
        </div>
      </div>

      {/* 2. METADATA ROW: DO, REFERENCE, PTS, DATE & TIME */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: label.doNumber ? '1.1fr 1.3fr 1fr' : '1.4fr 1fr',
          gap: isA5 ? '6px' : '4px',
          fontSize: isA5 ? '8.5pt' : '7pt',
          marginBottom: isA5 ? '4px' : '3px',
          flexShrink: 0,
        }}
      >
        {label.doNumber && (
          <div
            style={{
              border: '1.5px solid #000000',
              padding: isA5 ? '3px 6px' : '2px 5px',
              backgroundColor: '#F8FAFC',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: isA5 ? '6.5pt' : '5.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', lineHeight: 1 }}>
              DO NUMBER:
            </div>
            <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '9pt' : '7.5pt', color: '#000000', marginTop: '1px', lineHeight: 1.15, wordBreak: 'break-all' }}>
              {label.doNumber}
            </div>
          </div>
        )}

        <div
          style={{
            border: '1.5px solid #000000',
            padding: isA5 ? '3px 6px' : '2px 5px',
            backgroundColor: '#F8FAFC',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: isA5 ? '6.5pt' : '5.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', lineHeight: 1 }}>
            REFERENCE NO:
          </div>
          <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '9pt' : '7.5pt', color: '#000000', marginTop: '1px', lineHeight: 1.15, wordBreak: 'break-all' }}>
            {label.referenceNumber || '—'}
          </div>
          {label.deliveryOrder?.ptsNumber && (
            <div style={{ fontSize: isA5 ? '7.5pt' : '6pt', fontWeight: 800, color: '#1D4ED8', marginTop: '1px', lineHeight: 1, fontFamily: 'monospace' }}>
              PTS: {label.deliveryOrder.ptsNumber}
            </div>
          )}
        </div>

        <div
          style={{
            border: '1.5px solid #000000',
            padding: isA5 ? '3px 6px' : '2px 5px',
            backgroundColor: '#F8FAFC',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: isA5 ? '6.5pt' : '5.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', lineHeight: 1 }}>
            DATE &amp; TIME:
          </div>
          <div style={{ fontWeight: 900, fontSize: isA5 ? '8.5pt' : '7pt', color: '#000000', marginTop: '1px', lineHeight: 1.15 }}>
            {formattedDateTime}
          </div>
        </div>
      </div>

      {/* 3. HANDLING NOTE (COMPACT IF PRESENT) */}
      {label.handlingNote && (
        <div
          style={{
            border: '1px dashed #D97706',
            padding: isA5 ? '3px 6px' : '2px 5px',
            fontSize: isA5 ? '8pt' : '6.5pt',
            fontWeight: 700,
            backgroundColor: '#FFFBEB',
            color: '#92400E',
            marginBottom: isA5 ? '4px' : '3px',
            flexShrink: 0,
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>NOTE: </span>
          {label.handlingNote}
        </div>
      )}

      {/* 4. COMPACT FRAGILE FOOTER BANNER (IF FRAGILE) */}
      {label.isFragile && (
        <div
          style={{
            border: '2px solid #DC2626',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: isA5 ? '3px 8px' : '2px 6px',
            borderRadius: '2px',
            flexShrink: 0,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <span
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '9.5pt' : '8pt',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            ⚠️ FRAGILE
          </span>
          <span
            style={{
              fontWeight: 800,
              fontSize: isA5 ? '7.5pt' : '6.5pt',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              lineHeight: 1,
              color: '#B91C1C',
            }}
          >
            HANDLE WITH CARE
          </span>
        </div>
      )}
    </div>
  );
};

export default ShippingLabelPrintView;

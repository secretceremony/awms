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

  // Physical Dimensions (Standard: 148mm x 105mm landscape, Large: 210mm x 148mm landscape)
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
        padding: isA5 ? '5mm 6mm' : '3.5mm 4.5mm',
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
      {/* 1. TOP SECTION: 50% / 50% SENDER & RECIPIENT GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: isA5 ? '6px' : '4px',
          flex: '1 1 auto',
          minHeight: 0,
          marginBottom: isA5 ? '4px' : '3px',
        }}
      >
        {/* FROM / SENDER BOX (Left 50%) */}
        <div
          style={{
            border: '2px solid #000000',
            padding: isA5 ? '6px 8px' : '4px 6px',
            backgroundColor: '#FFFFFF',
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
                fontSize: isA5 ? '9pt' : '7.5pt',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#000000',
                letterSpacing: '0.8px',
                borderBottom: '2px solid #000000',
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
                lineHeight: 1.15,
                wordBreak: 'break-word',
                textTransform: 'uppercase',
              }}
            >
              {label.senderName || 'PT ALSSA CORPORINDO'}
            </div>
            <div
              style={{
                fontSize: isA5 ? '8.5pt' : '7pt',
                fontWeight: 600,
                color: '#1E293B',
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
                fontSize: isA5 ? '8.5pt' : '7pt',
                fontWeight: 800,
                color: '#000000',
                marginTop: '3px',
                paddingTop: '2px',
                borderTop: '1px solid #CBD5E1',
                lineHeight: 1.15,
              }}
            >
              TELP: {label.senderPhone}
            </div>
          )}
        </div>

        {/* SHIP TO / RECIPIENT BOX (Right 50%) */}
        <div
          style={{
            border: '2px solid #000000',
            padding: isA5 ? '6px 8px' : '4px 6px',
            backgroundColor: '#FFFFFF',
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
                fontSize: isA5 ? '9pt' : '7.5pt',
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#000000',
                letterSpacing: '0.8px',
                borderBottom: '2px solid #000000',
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
                lineHeight: 1.15,
                wordBreak: 'break-word',
                textTransform: 'uppercase',
              }}
            >
              {label.recipientName}
            </div>
            {label.attnName && (
              <div
                style={{
                  fontSize: isA5 ? '10pt' : '8pt',
                  fontWeight: 800,
                  color: '#000000',
                  marginTop: '2px',
                  lineHeight: 1.15,
                  wordBreak: 'break-word',
                }}
              >
                ATTN: {label.attnName}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: isA5 ? '9pt' : '7.5pt',
              fontWeight: 700,
              color: '#000000',
              marginTop: '3px',
              paddingTop: '2px',
              borderTop: '1px solid #CBD5E1',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            <span style={{ fontWeight: 900, color: '#000000' }}>DEST: </span>
            {label.destination}
          </div>
        </div>
      </div>

      {/* 2. METADATA ROW: DO, REFERENCE, PTS, DATE & TIME */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: label.doNumber
            ? (label.deliveryOrder?.ptsNumber ? '1fr 1fr 1fr 1fr' : '1.1fr 1.2fr 1fr')
            : (label.deliveryOrder?.ptsNumber ? '1.3fr 1.2fr 1fr' : '1.5fr 1fr'),
          gap: isA5 ? '5px' : '3px',
          marginBottom: isA5 ? '4px' : '3px',
          flexShrink: 0,
        }}
      >
        {label.doNumber && (
          <div
            style={{
              border: '2px solid #000000',
              padding: isA5 ? '3px 5px' : '2px 4px',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: isA5 ? '7pt' : '5.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', lineHeight: 1 }}>
              DO NUMBER
            </div>
            <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '9.5pt' : '7.5pt', color: '#000000', marginTop: '1px', lineHeight: 1.15, wordBreak: 'break-all' }}>
              {label.doNumber}
            </div>
          </div>
        )}

        <div
          style={{
            border: '2px solid #000000',
            padding: isA5 ? '3px 5px' : '2px 4px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: isA5 ? '7pt' : '5.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', lineHeight: 1 }}>
            REFERENCE NO
          </div>
          <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '9.5pt' : '7.5pt', color: '#000000', marginTop: '1px', lineHeight: 1.15, wordBreak: 'break-all' }}>
            {label.referenceNumber || '—'}
          </div>
        </div>

        {label.deliveryOrder?.ptsNumber && (
          <div
            style={{
              border: '2px solid #000000',
              padding: isA5 ? '3px 5px' : '2px 4px',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: isA5 ? '7pt' : '5.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', lineHeight: 1 }}>
              PTS NUMBER
            </div>
            <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: isA5 ? '9.5pt' : '7.5pt', color: '#000000', marginTop: '1px', lineHeight: 1.15, wordBreak: 'break-all' }}>
              {label.deliveryOrder.ptsNumber}
            </div>
          </div>
        )}

        <div
          style={{
            border: '2px solid #000000',
            padding: isA5 ? '3px 5px' : '2px 4px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: isA5 ? '7pt' : '5.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', lineHeight: 1 }}>
            DATE &amp; TIME
          </div>
          <div style={{ fontWeight: 900, fontSize: isA5 ? '8.5pt' : '7pt', color: '#000000', marginTop: '1px', lineHeight: 1.15 }}>
            {formattedDateTime}
          </div>
        </div>
      </div>

      {/* 3. HANDLING NOTE (BORDERED SECTION WITH STRONG NOTE LABEL) */}
      {label.handlingNote && (
        <div
          style={{
            border: '2px solid #000000',
            padding: isA5 ? '3px 6px' : '2px 5px',
            fontSize: isA5 ? '8.5pt' : '7pt',
            fontWeight: 700,
            backgroundColor: '#FFFFFF',
            color: '#000000',
            marginBottom: isA5 ? '4px' : '3px',
            flexShrink: 0,
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          <span style={{ fontWeight: 900, textTransform: 'uppercase', marginRight: '4px' }}>
            NOTE:
          </span>
          {label.handlingNote}
        </div>
      )}

      {/* 4. LARGE SOLID RED FRAGILE WARNING BANNER (FULL WIDTH AT BOTTOM) */}
      {label.isFragile && (
        <div
          style={{
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            border: '2px solid #991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isA5 ? '14px' : '10px',
            padding: isA5 ? '4px 8px' : '3px 6px',
            borderRadius: '1px',
            flexShrink: 0,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <span
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '13pt' : '10.5pt',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              lineHeight: 1,
              color: '#FFFFFF',
            }}
          >
            ⚠️ FRAGILE
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: isA5 ? '9.5pt' : '8pt',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              lineHeight: 1,
              color: '#FEF2F2',
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

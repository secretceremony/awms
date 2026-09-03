import React from 'react';
import { getCompanyIdentity } from '../../config/company.js';

export interface DeliveryOrderPrintViewProps {
  deliveryOrder: any;
}

export const DeliveryOrderPrintView: React.FC<DeliveryOrderPrintViewProps> = ({
  deliveryOrder,
}) => {
  if (!deliveryOrder) return null;

  const snapshot = deliveryOrder.snapshots || {};
  const clientName = deliveryOrder.clientCompanyName || snapshot.client?.name || deliveryOrder.client?.name || '—';
  const clientType = deliveryOrder.clientType || snapshot.client?.clientType || deliveryOrder.client?.clientType || '—';
  const attnName = deliveryOrder.attnName || snapshot.attn?.name || deliveryOrder.project?.clientContact?.name || '—';
  const attnPhone = deliveryOrder.attnPhone || snapshot.attn?.phone || deliveryOrder.project?.clientContact?.phone || '';
  const projectName = deliveryOrder.projectName || snapshot.project?.name || deliveryOrder.project?.name || '—';
  const siteCode = deliveryOrder.siteCode || snapshot.project?.siteCode || deliveryOrder.project?.siteCode || '';
  const projectLocation = deliveryOrder.projectLocation || snapshot.project?.location || deliveryOrder.project?.location || '—';
  const refNumber = deliveryOrder.referenceNumber || snapshot.project?.referenceNumber || deliveryOrder.project?.referenceNumber || '—';
  const activity = deliveryOrder.activity || snapshot.activity || 'General Dispatch';
  const warehouseName = deliveryOrder.warehouseName || snapshot.warehouse?.name || deliveryOrder.sourceWarehouse?.name || '—';
  const cityCode = deliveryOrder.warehouseCityCode || snapshot.warehouse?.cityCode || deliveryOrder.sourceWarehouse?.cityCode || '—';

  const companyIdentity = getCompanyIdentity(cityCode || warehouseName);

  const rawItems = snapshot.items || deliveryOrder.items || [];
  const items = rawItems.map((i: any, idx: number) => {
    // Collect serial numbers
    let snList: string[] = [];
    if (i.serials && Array.isArray(i.serials)) {
      snList = i.serials.map((s: any) => (typeof s === 'string' ? s : s.serialNumber)).filter(Boolean);
    } else if (i.itemSerials && Array.isArray(i.itemSerials)) {
      snList = i.itemSerials.map((s: any) => s.serialNumber || s.itemSerial?.serialNumber).filter(Boolean);
    }

    return {
      itemNo: i.itemNo || idx + 1,
      name: i.name || i.itemName || i.item?.name || '—',
      quantity: i.quantity,
      unitSymbol: i.unitSymbol || i.item?.unit?.symbol || i.unitName || i.item?.unit?.name || 'pcs',
      pic: i.pic || '—',
      remarks: i.remarks || '—',
      serials: snList,
    };
  });

  const formattedDate = deliveryOrder.date
    ? new Date(deliveryOrder.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div
      className="print-do-page"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
        fontSize: '9pt',
        lineHeight: 1.4,
        padding: '8px 12px',
      }}
    >
      {/* 1. TOP HEADER AREA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '6px',
        }}
      >
        {/* Logo & Company Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '65%' }}>
          <img
            src={companyIdentity.logoUrl}
            alt={companyIdentity.companyName}
            style={{
              height: '34px',
              maxWidth: '160px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />

          <div>
            <div
              style={{
                fontSize: '13pt',
                fontWeight: 'bold',
                color: '#1F2839',
                letterSpacing: '0.5px',
                lineHeight: 1.1,
              }}
            >
              {companyIdentity.companyName}
            </div>
            <div
              style={{
                fontSize: '7.5pt',
                color: '#555555',
                marginTop: '2px',
                lineHeight: 1.25,
              }}
            >
              <strong style={{ color: '#334155' }}>{companyIdentity.officeName}: </strong>
              {companyIdentity.address}
            </div>
          </div>
        </div>

        {/* Top-Right Document Meta */}
        <div
          style={{
            textAlign: 'right',
            fontSize: '8.5pt',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div>
            <span style={{ color: '#555555', fontWeight: 'bold' }}>DO Number: </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '9.5pt',
                color: '#2250A1',
              }}
            >
              {deliveryOrder.doNumber || 'DRAFT'}
            </span>
          </div>
          <div>
            <span style={{ color: '#555555', fontWeight: 'bold' }}>Date: </span>
            <span style={{ fontWeight: '600' }}>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Soft Blue Accent Divider Line */}
      <div
        style={{
          height: '2px',
          backgroundColor: '#2250A1',
          marginBottom: '8px',
        }}
      />

      {/* 2. CENTERED DOCUMENT TITLE */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '15pt',
            fontWeight: 'bold',
            color: '#1F2839',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          DELIVERY ORDER
        </h1>
      </div>

      {/* 3. DETAIL INFORMATION BLOCK (2-Column Bordered Block) */}
      <div
        style={{
          border: '1px solid #94A3B8',
          borderRadius: '3px',
          marginBottom: '10px',
          backgroundColor: '#FAFAFA',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          {/* Left Side Details */}
          <div
            style={{
              padding: '6px 10px',
              borderRight: '1px solid #CBD5E1',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
              <tbody>
                <tr>
                  <td style={{ width: '115px', fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Client / Company
                  </td>
                  <td style={{ width: '10px', padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000', fontWeight: '600' }}>
                    {clientName} {clientType && clientType !== '—' ? `[${clientType}]` : ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Attn
                  </td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000' }}>
                    {attnName} {attnPhone ? `(${attnPhone})` : ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Project
                  </td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000' }}>
                    {projectName}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Site / Location
                  </td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000' }}>
                    {siteCode ? `[${siteCode}] ` : ''}{projectLocation}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Side Details */}
          <div style={{ padding: '6px 10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
              <tbody>
                <tr>
                  <td style={{ width: '115px', fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    DO Date
                  </td>
                  <td style={{ width: '10px', padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000', fontWeight: '600' }}>
                    {formattedDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Reference No.
                  </td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#2250A1', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {refNumber}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Activity
                  </td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000' }}>
                    {activity}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
                    Source Hub
                  </td>
                  <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                  <td style={{ padding: '2px 0', color: '#000000' }}>
                    {warehouseName} [{cityCode}]
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. ITEM TABLE */}
      <table
        className="print-do-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '10px',
          fontSize: '8.5pt',
          pageBreakInside: 'auto',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#EBF3FA',
              color: '#1E293B',
              textAlign: 'center',
            }}
          >
            <th style={{ border: '1px solid #475569', padding: '5px 4px', width: '32px' }}>No.</th>
            <th style={{ border: '1px solid #475569', padding: '5px 8px', textAlign: 'left' }}>Item</th>
            <th style={{ border: '1px solid #475569', padding: '5px 8px', textAlign: 'left', width: '220px' }}>SN</th>
            <th style={{ border: '1px solid #475569', padding: '5px 6px', width: '45px' }}>Qty</th>
            <th style={{ border: '1px solid #475569', padding: '5px 6px', width: '55px' }}>Unit</th>
            <th style={{ border: '1px solid #475569', padding: '5px 8px', textAlign: 'left', width: '100px' }}>PIC</th>
            <th style={{ border: '1px solid #475569', padding: '5px 8px', textAlign: 'left', width: '130px' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, index: number) => (
            <tr key={index} style={{ pageBreakInside: 'avoid' }}>
              <td style={{ border: '1px solid #64748B', padding: '5px 4px', textAlign: 'center', verticalAlign: 'top' }}>
                {it.itemNo || index + 1}
              </td>
              <td style={{ border: '1px solid #64748B', padding: '5px 8px', verticalAlign: 'top', fontWeight: '500' }}>
                {it.name}
              </td>
              <td style={{ border: '1px solid #64748B', padding: '5px 8px', verticalAlign: 'top' }}>
                {it.serials && it.serials.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'monospace', fontSize: '8pt' }}>
                    {it.serials.map((sn: string, sIdx: number) => (
                      <div key={sIdx}>{sn}</div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#94A3B8' }}>-</span>
                )}
              </td>
              <td style={{ border: '1px solid #64748B', padding: '5px 6px', textAlign: 'center', verticalAlign: 'top', fontWeight: 'bold' }}>
                {it.quantity}
              </td>
              <td style={{ border: '1px solid #64748B', padding: '5px 6px', textAlign: 'center', verticalAlign: 'top' }}>
                {it.unitSymbol}
              </td>
              <td style={{ border: '1px solid #64748B', padding: '5px 8px', verticalAlign: 'top' }}>
                {it.pic}
              </td>
              <td style={{ border: '1px solid #64748B', padding: '5px 8px', verticalAlign: 'top' }}>
                {it.remarks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. NOTES (IF PRESENT) */}
      {deliveryOrder.notes && (
        <div
          style={{
            marginBottom: '12px',
            fontSize: '8pt',
            padding: '5px 8px',
            border: '1px dashed #94A3B8',
            borderRadius: '3px',
            backgroundColor: '#FAFAFA',
            pageBreakInside: 'avoid',
          }}
        >
          <strong style={{ color: '#334155' }}>Special Notes: </strong>
          <span>{deliveryOrder.notes}</span>
        </div>
      )}

      {/* 6. SIGNATURE SECTION (EXACTLY 2 BOXES) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginTop: '16px',
          marginBottom: '12px',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Left: Prepared By */}
        <div
          style={{
            border: '1px solid #94A3B8',
            borderRadius: '3px',
            padding: '8px 12px',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '8.5pt', color: '#334155' }}>
            Prepared By
          </div>
          <div>
            <div style={{ minHeight: '38px', display: 'flex', alignItems: 'flex-end', marginBottom: '2px' }}>
              <img
                src="/api/users/signature"
                alt="Signature"
                style={{
                  maxHeight: '38px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div
              style={{
                borderBottom: '1px solid #334155',
                paddingBottom: '2px',
                fontWeight: '600',
                fontSize: '8.5pt',
                color: '#000000',
              }}
            >
              {deliveryOrder.createdBy?.name || 'Pungki Surjanti'}
            </div>
            <div style={{ fontSize: '7.5pt', color: '#64748B', marginTop: '2px' }}>
              Logistics Admin
            </div>
          </div>
        </div>

        {/* Right: Received By */}
        <div
          style={{
            border: '1px solid #94A3B8',
            borderRadius: '3px',
            padding: '8px 12px',
            minHeight: '72px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '8.5pt', color: '#334155' }}>
            Received By
          </div>
          <div style={{ marginTop: '36px' }}>
            <div
              style={{
                borderBottom: '1px solid #334155',
                paddingBottom: '2px',
                fontSize: '8.5pt',
                color: '#94A3B8',
              }}
            >
              &nbsp;
            </div>
            <div style={{ fontSize: '7.5pt', color: '#64748B', marginTop: '2px' }}>
              Name, Signature & Date
            </div>
          </div>
        </div>
      </div>

      {/* 7. FOOTER (PAGE NUMBER ONLY) */}
      <div
        className="print-do-footer"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: '7.5pt',
          color: '#64748B',
          marginTop: '6px',
          borderTop: '1px dotted #CBD5E1',
          paddingTop: '4px',
          pageBreakInside: 'avoid',
        }}
      >
        <span className="page-number-indicator">Page 1 of 1</span>
      </div>
    </div>
  );
};

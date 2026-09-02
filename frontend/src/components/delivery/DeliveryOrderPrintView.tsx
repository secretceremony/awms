import React from 'react';

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

  const items = snapshot.items || (deliveryOrder.items || []).map((i: any, idx: number) => ({
    itemNo: idx + 1,
    name: i.itemName || i.item?.name,
    brand: i.brand || i.item?.brand,
    modelNumber: i.modelNumber || i.item?.modelNumber,
    quantity: i.quantity,
    unitSymbol: i.unitSymbol || i.item?.unit?.symbol || i.unitName || i.item?.unit?.name || 'pcs',
    pic: i.pic,
    remarks: i.remarks,
    serials: (i.itemSerials || []).map((s: any) => ({
      serialNumber: s.serialNumber || s.itemSerial?.serialNumber,
    })),
  }));

  return (
    <div className="print-do-page" style={{ padding: '20px', fontFamily: 'Arial, sans-serif', color: '#000', backgroundColor: '#fff' }}>
      {/* Header with Company Logo / Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            PT ALSSA LOGISTICS INDONESIA
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '9pt', color: '#333' }}>
            Integrated Warehouse & Logistics Management System (AWMS)
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '8.5pt', color: '#555' }}>
            Dispatch Hub: {warehouseName} [{cityCode}]
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0, fontSize: '16pt', fontWeight: 'bold', color: '#2250A1' }}>
            DELIVERY ORDER
          </h1>
          <div style={{ marginTop: '4px', fontSize: '10pt', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {deliveryOrder.doNumber || 'DRAFT DOCUMENT'}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '9pt',
          marginBottom: '16px',
          border: '1px solid #ccc',
          padding: '10px',
          borderRadius: '4px',
        }}
      >
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '32%', fontWeight: 'bold', padding: '2px 0' }}>Client / Company:</td>
                <td style={{ padding: '2px 0' }}>{clientName} [{clientType}]</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Attn / PIC:</td>
                <td style={{ padding: '2px 0' }}>{attnName} {attnPhone ? `(${attnPhone})` : ''}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Project:</td>
                <td style={{ padding: '2px 0' }}>{projectName}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Site / Location:</td>
                <td style={{ padding: '2px 0' }}>{siteCode ? `[${siteCode}] ` : ''}{projectLocation}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '35%', fontWeight: 'bold', padding: '2px 0' }}>DO Date:</td>
                <td style={{ padding: '2px 0' }}>{new Date(deliveryOrder.date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Reference No.:</td>
                <td style={{ padding: '2px 0', fontWeight: 'bold', fontFamily: 'monospace' }}>{refNumber}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Activity:</td>
                <td style={{ padding: '2px 0' }}>{activity}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Source Hub:</td>
                <td style={{ padding: '2px 0' }}>{warehouseName} [{cityCode}]</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table
        className="print-do-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          fontSize: '9pt',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ border: '1px solid #333', padding: '6px', width: '30px', textAlign: 'center' }}>No.</th>
            <th style={{ border: '1px solid #333', padding: '6px', textAlign: 'left' }}>Item Description</th>
            <th style={{ border: '1px solid #333', padding: '6px', textAlign: 'left' }}>Serial Number(s)</th>
            <th style={{ border: '1px solid #333', padding: '6px', width: '50px', textAlign: 'center' }}>Qty</th>
            <th style={{ border: '1px solid #333', padding: '6px', width: '55px', textAlign: 'center' }}>Unit</th>
            <th style={{ border: '1px solid #333', padding: '6px', width: '80px', textAlign: 'left' }}>PIC</th>
            <th style={{ border: '1px solid #333', padding: '6px', width: '120px', textAlign: 'left' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, index: number) => {
            const snList = it.serials ? it.serials.map((s: any) => s.serialNumber).filter(Boolean) : [];

            return (
              <tr key={index}>
                <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center' }}>
                  {it.itemNo || index + 1}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px' }}>
                  <div style={{ fontWeight: 'bold' }}>{it.name}</div>
                  {(it.brand || it.modelNumber) && (
                    <div style={{ fontSize: '8pt', color: '#555' }}>
                      {it.brand ? `Brand: ${it.brand}` : ''} {it.modelNumber ? `| MN: ${it.modelNumber}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px' }}>
                  {snList.length > 0 ? (
                    <div style={{ fontFamily: 'monospace', fontSize: '8.5pt' }}>
                      {snList.join(', ')}
                    </div>
                  ) : (
                    <span style={{ color: '#888' }}>—</span>
                  )}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                  {it.quantity}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center' }}>
                  {it.unitSymbol || 'pcs'}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px' }}>
                  {it.pic || '—'}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px' }}>
                  {it.remarks || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Notes / Special Instructions */}
      {deliveryOrder.notes && (
        <div style={{ marginBottom: '24px', fontSize: '8.5pt', padding: '8px', border: '1px dashed #999', borderRadius: '4px' }}>
          <strong>Special Instructions / Notes: </strong>
          <span>{deliveryOrder.notes}</span>
        </div>
      )}

      {/* 4 Signatures Block */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginTop: '30px',
          fontSize: '8.5pt',
          textAlign: 'center',
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ border: '1px solid #aaa', padding: '8px', borderRadius: '4px', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 'bold' }}>Prepared By</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '8pt' }}>
            {deliveryOrder.createdBy?.name || 'Logistics Admin'}
          </div>
        </div>

        <div style={{ border: '1px solid #aaa', padding: '8px', borderRadius: '4px', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 'bold' }}>Warehouse Dispatcher</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '8pt' }}>
            Name & Date
          </div>
        </div>

        <div style={{ border: '1px solid #aaa', padding: '8px', borderRadius: '4px', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 'bold' }}>Transporter / Carrier</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '8pt' }}>
            Name & Vehicle No.
          </div>
        </div>

        <div style={{ border: '1px solid #aaa', padding: '8px', borderRadius: '4px', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 'bold' }}>Received By</div>
          <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '8pt' }}>
            {attnName !== '—' ? attnName : 'Site PIC'}
          </div>
        </div>
      </div>
    </div>
  );
};

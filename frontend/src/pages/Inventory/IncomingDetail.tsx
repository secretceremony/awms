import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PageHeader, Button, Card, StatusBadge } from '../../components/ui/index.js';
import { ArrowLeft, RotateCcw, PackageCheck } from 'lucide-react';

export const IncomingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movement, setMovement] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res: any = await apiClient.get(`/stock-movements/incoming/${id}`);
        setMovement(res?.data || res);
      } catch (err) {
        console.error('Failed to load incoming detail:', err);
      }
    };
    if (id) {
      fetchDetail();
    }
  }, [id]);

  if (!movement) {
    return (
      <div className="page-container">
        <div className="table-loading">
          <p>Loading movement detail...</p>
        </div>
      </div>
    );
  }

  const isReturn = movement.movementType === 'RETURN';

  // Expand items for display
  const detailRows: Array<{
    id: string;
    itemName: string;
    brand: string | null;
    modelNumber: string | null;
    serialNumber: string;
    quantity: number;
    unit: string;
    condition: string;
    notes: string;
  }> = [];

  if (movement.items) {
    for (const entry of movement.items) {
      const item = entry.item || {};
      const unitStr = item.unit?.symbol || item.unit?.name || '-';
      const serials = entry.movementSerials || [];

      if (item.trackingType === 'SERIALIZED' && serials.length > 0) {
        for (const ms of serials) {
          const s = ms.itemSerial || {};
          detailRows.push({
            id: `ser-${ms.id || s.id}`,
            itemName: item.name || 'N/A',
            brand: item.brand || '-',
            modelNumber: item.modelNumber || '-',
            serialNumber: s.serialNumber || '-',
            quantity: 1,
            unit: unitStr,
            condition: s.conditionLabel || s.state || 'Standby Good',
            notes: s.notes || '-',
          });
        }
      } else {
        detailRows.push({
          id: `bulk-${entry.id}`,
          itemName: item.name || 'N/A',
          brand: item.brand || '-',
          modelNumber: item.modelNumber || '-',
          serialNumber: '-',
          quantity: entry.quantity,
          unit: unitStr,
          condition: '-',
          notes: movement.notes || '-',
        });
      }
    }
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/incoming')}>
          <ArrowLeft size={16} /> Back to Incoming &amp; Returns
        </Button>
      </div>

      <PageHeader
        title={`${isReturn ? 'Project Return Receipt' : 'Incoming Receipt'}: ${movement.movementNumber}`}
        description={`Movement Date: ${new Date(movement.movementDate || movement.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`}
        actions={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: isReturn ? '#F5F3FF' : '#EFF6FF',
              color: isReturn ? '#7C3AED' : '#2250A1',
              border: `1px solid ${isReturn ? '#DDD6FE' : '#BFDBFE'}`,
              textTransform: 'uppercase',
            }}
          >
            {isReturn ? <RotateCcw size={14} /> : <PackageCheck size={14} />}
            {isReturn ? 'Project Return' : 'Incoming'}
          </span>
        }
      />

      <Card title="Receipt Information">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
              {isReturn ? 'Source Project / Site' : 'Source / Origin'}
            </span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>
              {isReturn ? (
                <span>
                  {movement.project?.siteCode ? `[${movement.project.siteCode}] ` : ''}
                  {movement.project?.name || 'Project'}
                  {movement.project?.client?.name && ` (${movement.project.client.name})`}
                </span>
              ) : (
                'External Supplier'
              )}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Destination Warehouse</span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>
              {movement.destinationWarehouse?.name} {movement.destinationWarehouse?.cityCode ? `[${movement.destinationWarehouse.cityCode}]` : ''}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Reference / PO / DO</span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{movement.referenceNumber || '-'}</p>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Recorded By</span>
            <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{movement.createdBy?.name || '-'}</p>
          </div>
        </div>

        {movement.notes && (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Notes: </span>
            <span>{movement.notes}</span>
          </div>
        )}

        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2839', marginBottom: '12px' }}>
          {isReturn ? 'Returned Items & Assets' : 'Received Items & Serials'}
        </h3>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Brand</th>
                <th>MN</th>
                <th>SN</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Condition</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600, color: '#1F2839' }}>{row.itemName}</td>
                  <td>{row.brand}</td>
                  <td>{row.modelNumber !== '-' ? <code>{row.modelNumber}</code> : '-'}</td>
                  <td>
                    {row.serialNumber !== '-' ? (
                      <code
                        style={{
                          backgroundColor: '#F3F4F6',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E5E7EB',
                          fontSize: '12px',
                        }}
                      >
                        {row.serialNumber}
                      </code>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.quantity}</td>
                  <td>{row.unit}</td>
                  <td>
                    {row.condition !== '-' ? (
                      <StatusBadge type="condition" status={row.condition} />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: '#6B7280' }}>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default IncomingDetail;

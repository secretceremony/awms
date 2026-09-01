import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PageHeader, Button, Card, StatusBadge } from '../../components/ui/index.js';
import { ArrowLeft } from 'lucide-react';

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
          <p>Loading incoming movement detail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/incoming')}>
          <ArrowLeft size={16} /> Back to Incoming Records
        </Button>
      </div>

      <PageHeader
        title={`Incoming Movement: ${movement.movementNumber}`}
        description={`Recorded on ${new Date(movement.createdAt).toLocaleString()}`}
        actions={
          <StatusBadge type="status" status="in_stock" label="Received" />
        }
      />

      <Card title="Movement Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Destination Warehouse</span>
            <p style={{ fontWeight: 600 }}>{movement.destinationWarehouse?.name || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Reference / PO Number</span>
            <p style={{ fontWeight: 600 }}>{movement.referenceNumber || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Recorded By</span>
            <p style={{ fontWeight: 600 }}>{movement.createdBy?.name || '-'}</p>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Movement Type</span>
            <p style={{ fontWeight: 600 }}>{movement.movementType}</p>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2839', marginBottom: '12px' }}>
          Received Items
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Tracking</th>
                <th>Quantity</th>
                <th>Serial Numbers / Condition</th>
              </tr>
            </thead>
            <tbody>
              {movement.items?.map((item: any) => {
                const serials = item.movementSerials || item.serials || [];
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.item?.name}</td>
                    <td>
                      <StatusBadge type="tracking" status={item.item?.trackingType || 'BULK'} />
                    </td>
                    <td>
                      {item.quantity} {item.item?.unit?.name || ''}
                    </td>
                    <td>
                      {serials.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {serials.map((s: any, idx: number) => {
                            const sn = s.itemSerial?.serialNumber || s.serialNumber;
                            const state = s.itemSerial?.state || s.state || 'Standby Good';
                            const cond = s.itemSerial?.conditionLabel || s.conditionLabel;
                            return (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '12px',
                                  backgroundColor: '#F3F4F6',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #E5E7EB',
                                }}
                              >
                                <code>{sn}</code> {cond ? `(${cond})` : `[${state}]`}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default IncomingDetail;

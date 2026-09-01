import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';

export const IncomingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movement, setMovement] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get<any>(`/stock-movements/incoming/${id}`);
        setMovement(res.data.data || res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (id) {
      fetchDetail();
    }
  }, [id]);

  if (!movement) {
    return <div className="page-container">Loading...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Incoming Detail</h2>
        <button className="btn-secondary" onClick={() => navigate('/inventory/incoming')}>
          Back to List
        </button>
      </div>

      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ddd' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <strong>Movement No:</strong> {movement.movementNumber}
          </div>
          <div>
            <strong>Reference Code:</strong> {movement.referenceNumber || '-'}
          </div>
          <div>
            <strong>Destination Wh:</strong> {movement.destinationWarehouse?.name || '-'}
          </div>
          <div>
            <strong>Date:</strong> {new Date(movement.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>Created By:</strong> {movement.createdBy?.name || '-'}
          </div>
        </div>

        <h3>Items</h3>
        <table className="awms-table" style={{ width: '100%', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Serial Numbers</th>
            </tr>
          </thead>
          <tbody>
            {movement.items?.map((item: any) => (
              <tr key={item.id}>
                <td>{item.item?.name}</td>
                <td>{item.quantity}</td>
                <td>
                  {item.serials && item.serials.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {item.serials.map((s: any) => (
                        <li key={s.id}>
                          {s.serialNumber} {s.conditionLabel ? `(${s.conditionLabel})` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

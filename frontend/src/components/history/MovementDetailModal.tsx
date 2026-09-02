import React, { useState, useEffect } from 'react';
import { Modal, Button, StatusBadge } from '../ui/index.js';
import { apiClient } from '../../api/client.js';

interface MovementDetailModalProps {
  isOpen: boolean;
  movementId: number | null;
  onClose: () => void;
}

export const MovementDetailModal: React.FC<MovementDetailModalProps> = ({
  isOpen,
  movementId,
  onClose,
}) => {
  const [movement, setMovement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!movementId) return;
      setIsLoading(true);
      try {
        const res: any = await apiClient.get(`/stock-movements/${movementId}`);
        setMovement(res?.data || res);
      } catch (err) {
        console.error('Failed to load stock movement detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && movementId) {
      fetchDetail();
    } else {
      setMovement(null);
    }
  }, [isOpen, movementId]);

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

  if (movement && movement.items) {
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

  let locationDisplay = '-';
  if (movement?.destinationWarehouse) {
    locationDisplay = `${movement.destinationWarehouse.name} (${movement.destinationWarehouse.cityCode || 'WH'})`;
  } else if (movement?.sourceWarehouse) {
    locationDisplay = `${movement.sourceWarehouse.name} (${movement.sourceWarehouse.cityCode || 'WH'})`;
  } else if (movement?.project) {
    locationDisplay = `${movement.project.name} [${movement.project.jobNo || 'PRJ'}]`;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={movement ? `Movement Detail: ${movement.movementNumber}` : 'Stock Movement Details'}
      maxWidth="750px"
    >
      <div className="modal-body">
        {isLoading || !movement ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
            Loading movement detail...
          </div>
        ) : (
          <>
            {/* Movement Overview Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--accent-secondary-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Movement Date</span>
                <strong>
                  {new Date(movement.movementDate || movement.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: '2-digit',
                  })}
                </strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Movement Type</span>
                <StatusBadge type="condition" status={movement.movementType} label={movement.movementType} />
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Location</span>
                <strong>{locationDisplay}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Reference / PO / DO</span>
                <strong>{movement.referenceNumber || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', fontSize: '11px', display: 'block' }}>Recorded By</span>
                <strong>{movement.createdBy?.name || '-'}</strong>
              </div>
            </div>

            {movement.notes && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <strong style={{ color: '#1F2839' }}>Reason / Remarks:</strong> {movement.notes}
              </div>
            )}

            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1F2839', margin: '0 0 10px 0' }}>
              Movement Items &amp; Serial Entries
            </h4>

            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
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
                    <th>Remarks</th>
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
                              fontSize: '11px',
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
          </>
        )}
      </div>

      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

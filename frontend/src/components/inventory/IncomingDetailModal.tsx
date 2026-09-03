import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { RotateCcw, PackageCheck } from 'lucide-react';

interface IncomingDetailModalProps {
  isOpen: boolean;
  movementId: number | null;
  onClose: () => void;
}

export const IncomingDetailModal: React.FC<IncomingDetailModalProps> = ({
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
        const res: any = await apiClient.get(`/stock-movements/incoming/${movementId}`);
        setMovement(res?.data || res);
      } catch (err) {
        console.error('Failed to load movement detail:', err);
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

  // Expand items for display (for serialized items with multiple SNs, expand into individual SN rows)
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
        // Bulk entry
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

  const isReturn = movement?.movementType === 'RETURN';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        movement
          ? `${isReturn ? 'Project Return Receipt' : 'Incoming Receipt'}: ${movement.movementNumber}`
          : 'Movement Details'
      }
      maxWidth="800px"
    >
      <div className="modal-body">
        {isLoading || !movement ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
            Loading movement details...
          </div>
        ) : (
          <div>
            {/* Header Metadata Summary Card */}
            <div
              style={{
                backgroundColor: isReturn ? '#F5F3FF' : '#F8FAFC',
                border: `1px solid ${isReturn ? '#DDD6FE' : '#E2E8F0'}`,
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  borderBottom: `1px solid ${isReturn ? '#EDE9FE' : '#E2E8F0'}`,
                  paddingBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: isReturn ? '#8B5CF6' : '#2250A1',
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isReturn ? <RotateCcw size={12} /> : <PackageCheck size={12} />}
                    {isReturn ? 'Project Return' : 'Regular Incoming'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    Movement Date:{' '}
                    <strong>
                      {new Date(movement.movementDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  Recorded by: <strong>{movement.createdBy?.name || 'System Admin'}</strong>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <div style={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {isReturn ? 'Source Project / Site' : 'Origin / Source'}
                  </div>
                  <div style={{ fontWeight: 600, color: '#1F2839' }}>
                    {isReturn ? (
                      <div>
                        {movement.project?.siteCode ? `[${movement.project.siteCode}] ` : ''}
                        {movement.project?.name || 'Unknown Project'}
                        {movement.project?.client?.name && (
                          <span style={{ fontWeight: 400, color: '#6B7280', display: 'block', fontSize: '0.75rem' }}>
                            Client: {movement.project.client.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      'External Supplier / Vendor'
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Destination Hub
                  </div>
                  <div style={{ fontWeight: 600, color: '#1F2839' }}>
                    {movement.destinationWarehouse?.name}{' '}
                    {movement.destinationWarehouse?.cityCode ? `[${movement.destinationWarehouse.cityCode}]` : ''}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {isReturn ? 'DO / Return Reference' : 'PO / Reference Number'}
                  </div>
                  <div style={{ fontWeight: 600, color: '#1F2839', fontFamily: 'monospace' }}>
                    {movement.referenceNumber || '—'}
                  </div>
                </div>
              </div>

              {movement.notes && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: `1px dashed ${isReturn ? '#DDD6FE' : '#E2E8F0'}`, fontSize: '0.8rem', color: '#4B5563' }}>
                  <strong>Notes: </strong>
                  {movement.notes}
                </div>
              )}
            </div>

            {/* Received / Returned Items Breakdown Table */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#1F2839' }}>
                {isReturn ? 'Returned Items & Assets' : 'Received Items & Serials'} ({detailRows.length})
              </h4>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '35px' }}>#</th>
                      <th>Item Description</th>
                      <th>Serial Number</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Unit</th>
                      <th style={{ width: '130px' }}>Condition</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td style={{ color: '#6B7280', textAlign: 'center' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1F2839' }}>{row.itemName}</div>
                          {(row.brand || row.modelNumber) && (
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              {row.brand ? `Brand: ${row.brand} ` : ''}
                              {row.modelNumber ? `| MN: ${row.modelNumber}` : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          {row.serialNumber !== '-' ? (
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: isReturn ? '#7C3AED' : '#2250A1',
                              }}
                            >
                              {row.serialNumber}
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.quantity}</td>
                        <td style={{ textAlign: 'center' }}>{row.unit}</td>
                        <td>
                          {row.condition !== '-' ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  row.condition === 'Standby Bad'
                                    ? '#FEE2E2'
                                    : row.condition === 'Under Repair'
                                    ? '#FEF3C7'
                                    : '#DCFCE7',
                                color:
                                  row.condition === 'Standby Bad'
                                    ? '#991B1B'
                                    : row.condition === 'Under Repair'
                                    ? '#92400E'
                                    : '#166534',
                                fontWeight: 600,
                              }}
                            >
                              {row.condition}
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#4B5563' }}>{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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

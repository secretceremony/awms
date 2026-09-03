import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Warehouse, Building, User, Calendar, FileText, Plus } from 'lucide-react';

export interface OutgoingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movementId: number | null;
  onCreateDo?: (movementId: number) => void;
}

export const OutgoingDetailModal: React.FC<OutgoingDetailModalProps> = ({
  isOpen,
  onClose,
  movementId,
  onCreateDo,
}) => {
  const [movement, setMovement] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!movementId) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await apiClient.get(`/stock-movements/outgoing/${movementId}`);
        setMovement(data);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to load outgoing movement details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && movementId) {
      fetchDetail();
    }
  }, [isOpen, movementId]);

  if (!isOpen) return null;

  const hasDo = Boolean(movement?.deliveryOrder?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Outgoing Movement — ${movement?.movementNumber || 'Loading...'}`}
      maxWidth="750px"
    >
      <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

        {isLoading || !movement ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
            Loading movement details...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Movement Date
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {new Date(movement.movementDate).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Warehouse size={13} /> Source Warehouse
                </div>
                <div style={{ fontWeight: 600, color: '#2250A1', marginTop: '2px' }}>
                  {movement.sourceWarehouse?.name} [{movement.sourceWarehouse?.cityCode || 'WH'}]
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={13} /> Destination Project
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {movement.project?.name}{' '}
                  {movement.project?.siteCode && (
                    <span style={{ color: '#0891B2', fontWeight: 700 }}>[{movement.project.siteCode}]</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  Client: {movement.project?.client?.name || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> Recorded By
                </div>
                <div style={{ fontWeight: 500, color: '#374151', marginTop: '2px' }}>
                  {movement.createdBy?.name || movement.createdBy?.email || 'Admin'}
                </div>
              </div>
            </div>

            {/* Delivery Order Link Status Card */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: hasDo ? '#EFF6FF' : '#F8FAFC',
                border: hasDo ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color={hasDo ? '#2250A1' : '#64748B'} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Delivery Order Document</span>
                  {hasDo ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1', fontSize: '0.9rem' }}>
                      {movement.deliveryOrder.doNumber || `DO #${movement.deliveryOrder.id} (Draft)`}
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600, color: '#64748B', fontSize: '0.85rem' }}>
                      Not Created
                    </span>
                  )}
                </div>
              </div>

              {!hasDo && onCreateDo && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onCreateDo(movement.id);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                >
                  <Plus size={14} /> Create Delivery Order
                </Button>
              )}
            </div>

            {/* Dispatch Purpose */}
            {movement.notes && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '6px', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: '#1E40AF' }}>Purpose: </span>
                <span style={{ color: '#1E3A8A' }}>{movement.notes}</span>
              </div>
            )}

            {/* Items Table */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1F2839', marginBottom: '0.5rem' }}>
                Dispatched Items ({movement.items?.length || 0})
              </div>

              <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Item / Brand</th>
                      <th>Model Number</th>
                      <th>Tracking Type</th>
                      <th>Serial Numbers</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movement.items?.map((entry: any) => {
                      const isSerialized = entry.item?.trackingType === 'SERIALIZED';
                      const serialList = entry.movementSerials || [];

                      return (
                        <tr key={entry.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1F2839' }}>{entry.item?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{entry.item?.brand || '—'}</div>
                          </td>
                          <td>{entry.item?.modelNumber || '—'}</td>
                          <td>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: isSerialized ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                color: isSerialized ? '#8B5CF6' : '#0891B2',
                              }}
                            >
                              {entry.item?.trackingType}
                            </span>
                          </td>
                          <td>
                            {isSerialized && serialList.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {serialList.map((ms: any) => (
                                  <span
                                    key={ms.id}
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      backgroundColor: 'rgba(34, 80, 161, 0.08)',
                                      color: '#2250A1',
                                      border: '1px solid rgba(34, 80, 161, 0.2)',
                                    }}
                                  >
                                    {ms.itemSerial?.serialNumber}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }}>
                              {entry.quantity} {entry.item?.unit?.symbol || entry.item?.unit?.name || ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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

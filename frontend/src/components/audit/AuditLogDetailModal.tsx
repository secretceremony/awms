import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { User, Calendar, Database, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface AuditLogItem {
  id: number;
  userId: number | null;
  action: string;
  entityName: string;
  entityId: number | null;
  payload: any;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface AuditLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logId: number | null;
}

export const formatActionLabel = (rawAction: string): { text: string; color: string } => {
  const a = (rawAction || '').toUpperCase();

  if (a.includes('LOGIN')) return { text: 'Logged In', color: '#2563EB' };
  if (a.includes('LOGOUT')) return { text: 'Logged Out', color: '#6B7280' };
  if (a.includes('DEACTIVATE')) return { text: 'Deactivated', color: '#DC2626' };
  if (a.includes('REACTIVATE')) return { text: 'Reactivated', color: '#059669' };
  if (a.includes('CREATE')) return { text: 'Created', color: '#059669' };
  if (a.includes('DELETE')) return { text: 'Deleted', color: '#DC2626' };
  if (a.includes('UPDATE_STATUS')) return { text: 'Updated Status', color: '#D97706' };
  if (a.includes('UPDATE')) return { text: 'Updated', color: '#D97706' };
  if (a.includes('OUTGOING')) return { text: 'Outgoing Dispatch', color: '#2250A1' };
  if (a.includes('INCOMING')) return { text: 'Incoming Stock', color: '#0891B2' };
  if (a.includes('ADJUSTMENT')) return { text: 'Adjusted Stock', color: '#7C3AED' };

  return { text: rawAction.replace(/_/g, ' '), color: '#4B5563' };
};

export const getEntityRoute = (entityName: string, entityId: number | null): string | null => {
  if (!entityId) return null;
  const e = (entityName || '').toLowerCase();
  if (e.includes('project')) return `/projects`;
  if (e.includes('warehouse')) return `/warehouses`;
  if (e.includes('client') || e.includes('customer')) return `/clients`;
  if (e.includes('item')) return `/inventory/item/${entityId}`;
  if (e.includes('stock_movement') || e.includes('movement')) return `/inventory/movements`;
  return null;
};

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  isOpen,
  onClose,
  logId,
}) => {
  const [log, setLog] = useState<AuditLogItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!logId) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await apiClient.get<AuditLogItem>(`/audit-logs/${logId}`);
        setLog(data);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to load audit log details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && logId) {
      fetchDetail();
    }
  }, [isOpen, logId]);

  if (!isOpen) return null;

  const actionInfo = log ? formatActionLabel(log.action) : { text: '', color: '#4B5563' };
  const entityRoute = log ? getEntityRoute(log.entityName, log.entityId) : null;

  // Render before/after changes or payload summary
  const renderChanges = () => {
    if (!log || !log.payload) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
          No additional metadata recorded for this action.
        </div>
      );
    }

    const payload = log.payload;
    const oldVals = payload.oldValues || {};
    const newVals = payload.newValues || {};

    // 1. Comparison of Old vs New values
    const diffKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

    if (diffKeys.length > 0) {
      return (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
          <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Field</th>
                <th style={{ width: '37%' }}>Previous Value</th>
                <th style={{ width: '38%' }}>New Value</th>
              </tr>
            </thead>
            <tbody>
              {diffKeys.map((key) => {
                const oldV = oldVals[key] !== undefined ? String(oldVals[key]) : '—';
                const newV = newVals[key] !== undefined ? String(newVals[key]) : '—';
                const hasChanged = oldV !== newV;

                return (
                  <tr key={key} style={{ backgroundColor: hasChanged ? 'rgba(243, 244, 246, 0.6)' : undefined }}>
                    <td style={{ fontWeight: 600, color: '#374151' }}>{key}</td>
                    <td style={{ color: '#6B7280' }}>{oldV}</td>
                    <td style={{ fontWeight: hasChanged ? 600 : 400, color: hasChanged ? '#1F2839' : '#6B7280' }}>
                      {hasChanged ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowRight size={12} style={{ color: '#2250A1' }} /> {newV}
                        </span>
                      ) : (
                        newV
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // 2. Fallback structured payload view
    const generalKeys = Object.keys(payload).filter((k) => k !== 'oldValues' && k !== 'newValues');

    if (generalKeys.length > 0) {
      return (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
          <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Property</th>
                <th>Recorded Value</th>
              </tr>
            </thead>
            <tbody>
              {generalKeys.map((k) => (
                <tr key={k}>
                  <td style={{ fontWeight: 600, color: '#374151' }}>{k}</td>
                  <td style={{ color: '#1F2839' }}>
                    {typeof payload[k] === 'object' ? JSON.stringify(payload[k]) : String(payload[k])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Audit Log #${logId || ''}`}
      maxWidth="700px"
    >
      <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

        {isLoading || !log ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
            Loading audit details...
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
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Action</div>
                <div style={{ marginTop: '2px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: `${actionInfo.color}15`,
                      color: actionInfo.color,
                      border: `1px solid ${actionInfo.color}30`,
                    }}
                  >
                    {actionInfo.text}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> Authenticated User
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {log.user?.name || 'System / Guest'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  {log.user?.email || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Timestamp
                </div>
                <div style={{ fontWeight: 500, color: '#1F2839', marginTop: '2px', fontSize: '0.85rem' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Database size={13} /> Module & Reference
                </div>
                <div style={{ fontWeight: 600, color: '#1F2839', marginTop: '2px' }}>
                  {log.entityName || 'System'}{' '}
                  {log.entityId ? (
                    entityRoute ? (
                      <Link
                        to={entityRoute}
                        onClick={onClose}
                        style={{
                          color: '#2250A1',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          marginLeft: '4px',
                        }}
                      >
                        #{log.entityId} <ExternalLink size={12} />
                      </Link>
                    ) : (
                      <span style={{ color: '#6B7280' }}>#{log.entityId}</span>
                    )
                  ) : null}
                </div>
              </div>
            </div>

            {/* Changes Section */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1F2839', marginBottom: '0.5rem' }}>
                Recorded Field Changes & Attributes
              </div>
              {renderChanges()}
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

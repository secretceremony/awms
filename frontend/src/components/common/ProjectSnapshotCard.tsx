import React from 'react';
import { Building, MapPin, Hash, User } from 'lucide-react';

export interface ProjectSnapshotCardProps {
  clientName?: string | null;
  clientType?: string | null;
  attnName?: string | null;
  attnPhone?: string | null;
  projectName?: string | null;
  referenceNumber?: string | null;
  projectLocation?: string | null;
  siteCode?: string | null;
  variant?: 'blue' | 'gray';
}

export const ProjectSnapshotCard: React.FC<ProjectSnapshotCardProps> = ({
  clientName,
  clientType,
  attnName,
  attnPhone,
  projectName,
  referenceNumber,
  projectLocation,
  siteCode,
  variant = 'blue',
}) => {
  const isBlue = variant === 'blue';

  return (
    <div
      style={{
        backgroundColor: isBlue ? '#F8FAFC' : '#F9FAFB',
        border: `1px solid ${isBlue ? '#CBD5E1' : '#E5E7EB'}`,
        borderRadius: '6px',
        padding: '0.85rem 1rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          fontSize: '0.85rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building size={13} /> Client / Company
          </span>
          <div style={{ fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
            {clientName || '—'}{' '}
            {clientType && (
              <span style={{ fontSize: '0.75rem', color: '#2250A1', fontWeight: 600 }}>
                [{clientType}]
              </span>
            )}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={13} /> Attn / Client PIC
          </span>
          <div style={{ fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
            {attnName || '—'}{' '}
            {attnPhone && (
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>
                ({attnPhone})
              </span>
            )}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} /> Site / Location
          </span>
          <div style={{ fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
            {siteCode ? `[${siteCode}] ` : ''}
            {projectLocation || projectName || '—'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Hash size={13} /> Reference Number
          </span>
          <div style={{ fontWeight: 700, color: referenceNumber ? '#2250A1' : '#EF4444', fontFamily: 'monospace', marginTop: '2px' }}>
            {referenceNumber || 'Missing (Required for DO)'}
          </div>
        </div>
      </div>
    </div>
  );
};

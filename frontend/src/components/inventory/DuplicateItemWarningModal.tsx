import React from 'react';
import { Modal, Button } from '../ui/index.js';
import { AlertTriangle } from 'lucide-react';

export interface MatchingItem {
  id: number;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  unit?: { name: string; symbol: string | null };
  trackingType: 'BULK' | 'SERIALIZED';
}

export interface DuplicateItemWarningModalProps {
  isOpen: boolean;
  matches: MatchingItem[];
  onCancel: () => void;
  onContinue: () => void;
}

export const DuplicateItemWarningModal: React.FC<DuplicateItemWarningModalProps> = ({
  isOpen,
  matches,
  onCancel,
  onContinue,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Similar Item Already Exists"
      maxWidth="500px"
    >
      <div className="modal-body">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ color: '#D97706', marginTop: '2px' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '14px', color: '#1F2839', fontWeight: 500 }}>
              The following item(s) with similar name, brand, or model number already exist in master data:
            </p>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}
        >
          {matches.map((item, idx) => (
            <div
              key={item.id}
              style={{
                padding: '10px 14px',
                backgroundColor: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--accent-secondary-bg)',
                borderBottom: idx === matches.length - 1 ? 'none' : '1px solid var(--card-border)',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1F2839' }}>{item.name}</div>
              <div style={{ color: '#6B7280', fontSize: '12px', marginTop: '2px' }}>
                Brand: <strong>{item.brand || '-'}</strong> • MN: <strong>{item.modelNumber || '-'}</strong> • Unit: <strong>{item.unit?.symbol || item.unit?.name || '-'}</strong>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: '#4B5563', margin: 0 }}>
          Do you want to continue creating this item anyway?
        </p>
      </div>

      <div className="modal-footer">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Continue Anyway
        </Button>
      </div>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Modal,
  FormField,
  Textarea,
  Select,
  Button,
} from '../../ui/index.js';

export interface SerialItemEntry {
  serialNumber: string;
  conditionLabel: string;
  notes: string;
}

export interface BatchPasteSerialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySerials: (rows: SerialItemEntry[]) => void;
  defaultCondition?: string;
}

export const BatchPasteSerialsModal: React.FC<BatchPasteSerialsModalProps> = ({
  isOpen,
  onClose,
  onApplySerials,
  defaultCondition = 'Standby Good',
}) => {
  const [pasteText, setPasteText] = useState('');
  const [pasteCondition, setPasteCondition] = useState(defaultCondition);
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPasteText('');
      setPasteCondition(defaultCondition);
      setPasteError(null);
    }
  }, [isOpen, defaultCondition]);

  const handleApply = () => {
    setPasteError(null);
    if (!pasteText.trim()) return;

    const rawList = pasteText
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawList.length === 0) return;

    const seen = new Set<string>();
    const duplicates: string[] = [];
    const newRows: SerialItemEntry[] = [];

    rawList.forEach((sn) => {
      if (seen.has(sn)) {
        duplicates.push(sn);
      } else {
        seen.add(sn);
        newRows.push({
          serialNumber: sn,
          conditionLabel: pasteCondition,
          notes: '',
        });
      }
    });

    if (duplicates.length > 0) {
      setPasteError(`Duplicate serial numbers found in paste: ${duplicates.join(', ')}`);
      return;
    }

    onApplySerials(newRows);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Paste Serial Numbers"
      maxWidth="500px"
    >
      <Modal.Body>
        {pasteError && <div className="alert-error">{pasteError}</div>}
        <p className="form-helper" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Paste multiple serial numbers separated by newlines or commas.
        </p>

        <FormField label="Serial Numbers *" required>
          <Textarea
            rows={6}
            placeholder="SN001&#10;SN002&#10;SN003"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            style={{ fontFamily: 'monospace' }}
          />
        </FormField>

        <FormField label="Default Initial Condition">
          <Select
            value={pasteCondition}
            onChange={(e) => setPasteCondition(e.target.value)}
          >
            <option value="Standby Good">Standby Good</option>
            <option value="Standby Bad">Standby Bad</option>
            <option value="Under Repair">Under Repair</option>
          </Select>
        </FormField>
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleApply}>
          Apply Serials
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BatchPasteSerialsModal;

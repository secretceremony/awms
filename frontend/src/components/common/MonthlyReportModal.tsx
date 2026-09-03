import React, { useState } from 'react';
import { Modal, FormField, Select, Button } from '../ui/index.js';
import { Download, Calendar } from 'lucide-react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [2024, 2025, 2026, 2027];

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/exports/monthly-report?month=${month}&year=${year}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate monthly report');
      }

      const blob = await response.blob();
      const monthStr = String(month).padStart(2, '0');
      const filename = `AWMS_Monthly_Report_${year}-${monthStr}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMsg(err.message || 'Error downloading monthly report.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Monthly Inventory Report" maxWidth="520px">
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {errorMsg && (
          <div className="alert-error" style={{ marginBottom: 0 }}>
            {errorMsg}
          </div>
        )}

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Calendar size={20} color="#2250A1" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.875rem' }}>
              Operational Monthly Report
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
              Includes 6 structured sheets: <strong>Summary</strong>, <strong>Incoming</strong>, <strong>Returns</strong>, <strong>Outgoing</strong>, <strong>Adjustments</strong>, and <strong>Current Stock Position</strong> based on official movement dates.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <FormField label="Select Month *" required>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Select Year *" required>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose} disabled={isDownloading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleDownload}
          isLoading={isDownloading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={14} /> Generate Report (.xlsx)
        </Button>
      </div>
    </Modal>
  );
};

export default MonthlyReportModal;

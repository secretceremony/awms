import React, { useState, useRef } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Upload, Download, CheckCircle2, AlertCircle, AlertTriangle, FileSpreadsheet, RotateCcw } from 'lucide-react';

export type ImportType = 'INITIAL_STOCK' | 'INCOMING' | 'OUTGOING';

interface ValidatedRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID' | 'WARNING';
  errors: string[];
  warnings: string[];
  data: Record<string, any>;
}

interface ValidationSummary {
  importType: string;
  filename: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  rows: ValidatedRow[];
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportType;
  title: string;
  templateType: 'initial-stock' | 'incoming' | 'outgoing';
  onSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  importType,
  title,
  templateType,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/api/imports/templates/${templateType}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AWMS_Import_Template_${templateType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error downloading template');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.xlsx')) {
      setErrorMsg('Please upload a valid Excel spreadsheet (.xlsx)');
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setIsValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', selected);
      formData.append('importType', importType);

      const res: any = await apiClient.post('/imports/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const summary = res?.data || res;
      setValidation(summary);
    } catch (err: any) {
      console.error('Validation error:', err);
      setErrorMsg(err.message || 'Failed to parse and validate spreadsheet.');
      setValidation(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validation) return;
    const validRows = validation.rows.filter((r) => r.status === 'VALID').map((r) => r.data);
    if (validRows.length === 0) {
      setErrorMsg('No valid rows available to import.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      await apiClient.post('/imports/confirm', {
        importType,
        rows: validRows,
        filename: file?.name || 'import.xlsx',
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Import confirmation failed:', err);
      setErrorMsg(err.message || 'Failed to complete import.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="880px">
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {errorMsg && (
          <div className="alert-error" style={{ marginBottom: 0 }}>
            {errorMsg}
          </div>
        )}

        {/* Template Download & Upload Banner */}
        {!validation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem', display: 'block' }}>
                  Step 1: Download Standard Template
                </span>
                <span style={{ fontSize: '0.8rem', color: '#1E3A8A' }}>
                  Use the pre-formatted columns to ensure proper validation of warehouses, items, serial numbers, and units.
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadTemplate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF' }}
              >
                <Download size={15} /> Download Import Template
              </Button>
            </div>

            {/* Drop / File Input Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '8px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) {
                  const fakeEvent = { target: { files: [dropped] } } as any;
                  handleFileChange(fakeEvent);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <FileSpreadsheet size={40} color="#2250A1" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '1rem' }}>
                {isValidating ? 'Parsing and validating spreadsheet...' : 'Click to Upload or Drag & Drop Excel File (.xlsx)'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '6px 0 0' }}>
                Only .xlsx spreadsheets are accepted. Max file size: 10MB.
              </p>
            </div>
          </div>
        )}

        {/* Validation Summary & Preview Table */}
        {validation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Status Metric Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                gap: '10px',
              }}
            >
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Total Rows</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>
                  {validation.totalRows}
                </div>
              </div>

              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '10px 14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065F46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Valid Rows
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {validation.validRows}
                </div>
              </div>

              {validation.warningRows > 0 && (
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={13} /> Warnings
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
                    {validation.warningRows}
                  </div>
                </div>
              )}

              {validation.invalidRows > 0 && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} /> Invalid Rows
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                    {validation.invalidRows}
                  </div>
                </div>
              )}
            </div>

            {/* File details & Re-upload button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                File: {file?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <RotateCcw size={14} /> Upload Another File
              </Button>
            </div>

            {/* Preview Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
              <div className="table-container" style={{ margin: 0, maxHeight: '320px', overflowY: 'auto' }}>
                <table style={{ margin: 0, fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Row</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th>Item Name</th>
                      <th>Location / Project</th>
                      <th>Tracking</th>
                      <th>SN / Qty</th>
                      <th>Validation Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.rows.map((r) => (
                      <tr
                        key={r.rowNumber}
                        style={{
                          backgroundColor: r.status === 'INVALID' ? '#FEF2F2' : r.status === 'WARNING' ? '#FFFBEB' : '#FFFFFF',
                        }}
                      >
                        <td style={{ fontWeight: 700, color: '#64748B' }}>#{r.rowNumber}</td>
                        <td>
                          {r.status === 'VALID' && (
                            <span className="badge-pill badge-green badge-sm">Valid</span>
                          )}
                          {r.status === 'WARNING' && (
                            <span className="badge-pill badge-yellow badge-sm">Warning</span>
                          )}
                          {r.status === 'INVALID' && (
                            <span className="badge-pill badge-red badge-sm">Invalid</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: '#1E293B' }}>{r.data.itemName || '—'}</td>
                        <td style={{ color: '#475569' }}>
                          {r.data.projectName || r.data.warehouseName || '—'}
                        </td>
                        <td>
                          <span className={`badge-pill ${r.data.trackingType === 'SERIALIZED' ? 'tracking-serialized' : 'tracking-bulk'} badge-sm`}>
                            {r.data.trackingType || 'BULK'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#1E293B' }}>
                          {r.data.trackingType === 'SERIALIZED'
                            ? r.data.serialNumber || '—'
                            : `${r.data.quantity || 0} ${r.data.unit || ''}`}
                        </td>
                        <td>
                          {r.errors.length > 0 && (
                            <div style={{ color: '#DC2626', fontWeight: 600 }}>
                              {r.errors.join(' • ')}
                            </div>
                          )}
                          {r.warnings.length > 0 && (
                            <div style={{ color: '#D97706' }}>
                              {r.warnings.join(' • ')}
                            </div>
                          )}
                          {r.errors.length === 0 && r.warnings.length === 0 && (
                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Ready to import
                            </span>
                          )}
                        </td>
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
        <Button variant="secondary" onClick={handleClose} disabled={isImporting}>
          Cancel
        </Button>
        {validation && (
          <Button
            variant="primary"
            onClick={handleConfirmImport}
            isLoading={isImporting}
            disabled={validation.validRows === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={14} /> Confirm Import ({validation.validRows} rows)
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default ExcelImportModal;

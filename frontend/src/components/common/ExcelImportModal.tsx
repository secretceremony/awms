import React, { useState, useRef } from 'react';
import { Modal, Button } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Download, CheckCircle2, AlertCircle, AlertTriangle, FileSpreadsheet, RotateCcw, Calendar, User, Layers } from 'lucide-react';
import { formatDateTime } from '../../utils/datetime.js';

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

interface ImportResult {
  filename: string;
  importType: string;
  importedAt: string;
  importedBy: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setImportResult(null);
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

      setValidation(res);
    } catch (err: any) {
      console.error('Validation error:', err);
      setErrorMsg(err.message || 'Failed to parse and validate Excel file.');
      setFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validation) return;
    const validRows = validation.rows.filter((r) => r.status !== 'INVALID').map((r) => r.data);

    if (validRows.length === 0) {
      setErrorMsg('Cannot import file: no valid rows found.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const res: any = await apiClient.post('/imports/confirm', {
        importType,
        rows: validRows,
        filename: file?.name || 'import.xlsx',
      });

      setImportResult(res);
      onSuccess();
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

        {/* Success / Result View */}
        {importResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
              }}
            >
              <CheckCircle2 size={28} color="#059669" />
              <div>
                <h4 style={{ margin: 0, color: '#065F46', fontSize: '1rem', fontWeight: 700 }}>
                  Import Completed Successfully
                </h4>
                <p style={{ margin: '2px 0 0', color: '#047857', fontSize: '0.85rem' }}>
                  All valid records have been imported and updated in the system ledger.
                </p>
              </div>
            </div>

            {/* Metadata Summary Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileSpreadsheet size={13} /> Filename
                </span>
                <strong style={{ color: '#1E293B', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
                  {importResult.filename}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={13} /> Import Type
                </span>
                <strong style={{ color: '#2250A1', display: 'block', marginTop: '2px' }}>
                  {importResult.importType}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Imported At
                </span>
                <strong style={{ color: '#1E293B', display: 'block', marginTop: '2px' }}>
                  {formatDateTime(importResult.importedAt, 'WITA')}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> Imported By
                </span>
                <strong style={{ color: '#1E293B', display: 'block', marginTop: '2px' }}>
                  {importResult.importedBy}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'block' }}>Total Rows</span>
                <strong style={{ color: '#1E293B', display: 'block', marginTop: '2px' }}>
                  {importResult.totalRows}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'block' }}>Successful Rows</span>
                <strong style={{ color: '#059669', display: 'block', marginTop: '2px' }}>
                  {importResult.successfulRows}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'block' }}>Failed Rows</span>
                <strong style={{ color: importResult.failedRows > 0 ? '#DC2626' : '#64748B', display: 'block', marginTop: '2px' }}>
                  {importResult.failedRows}
                </strong>
              </div>
            </div>
          </div>
        ) : !validation ? (
          /* Template Download & Upload Banner */
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
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const dropped = e.dataTransfer.files[0];
                  if (dropped.name.endsWith('.xlsx')) {
                    const evt = { target: { files: [dropped] } } as any;
                    handleFileChange(evt);
                  } else {
                    setErrorMsg('Please upload a valid Excel spreadsheet (.xlsx)');
                  }
                }
              }}
            >
              <FileSpreadsheet size={36} color="#2250A1" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontWeight: 600, color: '#1F2839', fontSize: '0.95rem' }}>
                {isValidating ? 'Validating Excel spreadsheet...' : 'Click or drag & drop Excel file here'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
                Supports standard format (.xlsx). Maximum 500 rows per batch.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          /* Validation Review */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={20} color="#2250A1" />
                <span style={{ fontWeight: 600, color: '#1F2839', fontSize: '0.9rem' }}>
                  {validation.filename}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#E0F2FE', color: '#0369A1' }}>
                  Total: {validation.totalRows}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }}>
                  Valid: {validation.validRows}
                </span>
                {validation.warningRows > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#B45309' }}>
                    Warnings: {validation.warningRows}
                  </span>
                )}
                {validation.invalidRows > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                    Invalid: {validation.invalidRows}
                  </span>
                )}
              </div>
            </div>

            {/* Validation Rows Table */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                    <th style={{ padding: '8px 10px', width: '50px' }}>Row</th>
                    <th style={{ padding: '8px 10px', width: '80px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>Item Details</th>
                    <th style={{ padding: '8px 10px' }}>Notes / Validation Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.rows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: r.status === 'INVALID' ? '#FEF2F2' : r.status === 'WARNING' ? '#FFFBEB' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#64748B' }}>
                        #{r.rowNumber}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {r.status === 'VALID' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> OK
                          </span>
                        ) : r.status === 'WARNING' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#D97706', fontWeight: 600 }}>
                            <AlertTriangle size={13} /> Notice
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#DC2626', fontWeight: 600 }}>
                            <AlertCircle size={13} /> Error
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{r.data.itemName || '—'}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748B' }}>
                          {r.data.quantity ? `Qty: ${r.data.quantity} ${r.data.unit || ''}` : ''}
                          {r.data.serialNumber ? `SN: ${r.data.serialNumber}` : ''}
                          {r.data.warehouseName ? ` • WH: ${r.data.warehouseName}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {r.errors.length > 0 && (
                          <div style={{ color: '#DC2626', fontSize: '0.75rem' }}>
                            {r.errors.join('; ')}
                          </div>
                        )}
                        {r.warnings.length > 0 && (
                          <div style={{ color: '#D97706', fontSize: '0.75rem' }}>
                            {r.warnings.join('; ')}
                          </div>
                        )}
                        {r.errors.length === 0 && r.warnings.length === 0 && (
                          <span style={{ color: '#9CA3AF' }}>Ready to import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {importResult ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div>
              {validation && (
                <Button variant="ghost" size="sm" onClick={handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCcw size={14} /> Upload Different File
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              {validation && (
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={isImporting || validation.validRows + validation.warningRows === 0}
                >
                  {isImporting ? 'Importing Records...' : `Import ${validation.validRows + validation.warningRows} Valid Rows`}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

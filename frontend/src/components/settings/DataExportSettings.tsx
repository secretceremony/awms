import React, { useState } from 'react';
import { Card, Button, FormField, Select } from '../ui/index.js';
import { downloadAllDataWorkbook } from '../../utils/exportWorkbook.js';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  Boxes,
  Package,
  Building,
  Users,
  Warehouse,
  Briefcase,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileText,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const DataExportSettings: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isMonthlyExporting, setIsMonthlyExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

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

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await downloadAllDataWorkbook();
      setSuccessMsg('Full workbook generated and downloaded successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate export workbook.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMonthlyExport = async () => {
    setIsMonthlyExporting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`/api/exports/monthly-report?month=${selectedMonth}&year=${selectedYear}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to generate monthly report');
      const blob = await response.blob();
      const monthStr = String(selectedMonth).padStart(2, '0');
      const filename = `AWMS_Monthly_Report_${selectedYear}-${monthStr}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMsg(`Monthly report for ${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear} downloaded successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to download monthly report.');
    } finally {
      setIsMonthlyExporting(false);
    }
  };

  const datasets = [
    { title: 'Stock List', icon: Boxes, desc: 'Current serialized assets and bulk inventory balances' },
    { title: 'Master Items', icon: Package, desc: 'Item catalog, brands, model numbers, tracking types' },
    { title: 'Clients', icon: Building, desc: 'Company clients, partner categories, contact info' },
    { title: 'Client Contacts', icon: Users, desc: 'Authorized attention contact persons (Attn)' },
    { title: 'Warehouses', icon: Warehouse, desc: 'Storage facilities, hubs, city codes, and locations' },
    { title: 'Projects', icon: Briefcase, desc: 'Active and archived client site project allocations' },
    { title: 'Incoming & Returns', icon: ArrowDownLeft, desc: 'Receiving logs and equipment returns with conditions' },
    { title: 'Outgoing Dispatches', icon: ArrowUpRight, desc: 'Dispatched materials linked to DOs and PIC sign-offs' },
    { title: 'Movement History', icon: History, desc: 'Complete immutable ledger of all historical stock events' },
    { title: 'Delivery Orders', icon: FileText, desc: 'Official DO headers, dates, references, and statuses' },
    { title: 'DO Line Items', icon: FileText, desc: 'Item quantities, remarks, and serialized device allocations' },
    { title: 'Shipping Labels', icon: Tag, desc: 'Generated dispatch labels, fragile indicators, handling notes' },
    { title: 'Activity Logs', icon: ShieldCheck, desc: 'Sanitized audit trails (auth credentials excluded)' },
  ];

  return (
    <div style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {successMsg && (
        <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert-error">
          {errorMsg}
        </div>
      )}

      {/* MONTHLY OPERATIONAL REPORT CARD */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
          <Calendar size={20} color="#2250A1" />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
              Monthly Inventory &amp; Movement Report
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Generate operational reports with 6 sheets: Summary, Incoming, Returns, Outgoing, Adjustments, and Current Stock Position.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ width: '160px' }}>
            <FormField label="Select Month" style={{ marginBottom: 0 }}>
              <Select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div style={{ width: '120px' }}>
            <FormField label="Select Year" style={{ marginBottom: 0 }}>
              <Select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <Button
            variant="primary"
            onClick={handleMonthlyExport}
            disabled={isMonthlyExporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '38px' }}
          >
            {isMonthlyExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isMonthlyExporting ? 'Generating Report...' : 'Download Monthly Report (.xlsx)'}
          </Button>
        </div>
      </Card>

      {/* FULL SYSTEM EXPORT CARD */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1F2839' }}>
              Complete Data Backup &amp; Master Export
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
              Download a consolidated multi-sheet Excel workbook (.xlsx) containing all active and historical inventory records.
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.65rem 1.25rem' }}
          >
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {isExporting ? 'Generating Workbook...' : 'Export All Datasets (.xlsx)'}
          </Button>
        </div>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
            <FileSpreadsheet size={20} color="#059669" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>
              Included Full Datasets (13 Sheets)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '12px',
            }}
          >
            {datasets.map((d, idx) => {
              const Icon = d.icon;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: '#1E293B', marginBottom: '2px' }}>
                    <Icon size={14} color="#2250A1" />
                    <span>{d.title}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
                    {d.desc}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.25rem', padding: '10px 12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE', fontSize: '0.775rem', color: '#1E3A8A' }}>
            🔒 <strong>Security & Compliance:</strong> Passwords, session tokens, secret keys, and raw authentication hashes are automatically sanitized and never included in data exports.
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DataExportSettings;

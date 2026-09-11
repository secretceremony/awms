import React, { useState } from 'react';
import { PageHeader, Card, Button, FormField, Select } from '../components/ui/index.js';
import { useToast } from '../context/ToastContext.js';
import { downloadAllDataWorkbook } from '../utils/exportWorkbook.js';
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
  Calendar,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isMonthlyExporting, setIsMonthlyExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    try {
      await downloadAllDataWorkbook();
      showToast({
        type: 'success',
        message: 'Full system workbook generated and downloaded successfully.',
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to generate export workbook.';
      setErrorMsg(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsExporting(false);
    }
  };

  const handleMonthlyExport = async () => {
    setIsMonthlyExporting(true);
    setErrorMsg(null);
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

      const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
      showToast({
        type: 'success',
        message: `Monthly report for ${monthLabel} ${selectedYear} downloaded successfully.`,
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to download monthly report.';
      setErrorMsg(msg);
      showToast({ type: 'error', message: msg });
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
    <div className="page-container">
      <PageHeader
        title="Reports & Exports"
        description="Generate operational monthly movement summaries and download full system data workbooks"
      />

      {errorMsg && (
        <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '840px' }}>
        {/* MONTHLY OPERATIONAL REPORT CARD */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--card-border, #E2E8F0)' }}>
            <Calendar size={20} color="var(--primary-color, #2250A1)" />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #1E293B)' }}>
                Monthly Inventory &amp; Movement Report
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)' }}>
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #1F2839)' }}>
                Complete Data Backup &amp; Master Export
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary, #6B7280)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--card-border, #E2E8F0)' }}>
              <FileSpreadsheet size={20} color="#059669" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #1E293B)' }}>
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
                      backgroundColor: 'var(--accent-secondary-bg, #F8FAFC)',
                      borderRadius: '6px',
                      border: '1px solid var(--card-border, #E2E8F0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary, #1E293B)', marginBottom: '2px' }}>
                      <Icon size={14} color="var(--primary-color, #2250A1)" />
                      <span>{d.title}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748B)', lineHeight: 1.3 }}>
                      {d.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.25rem', padding: '10px 12px', backgroundColor: 'var(--accent-primary-light, #EFF6FF)', borderRadius: '6px', border: '1px solid #BFDBFE', fontSize: '0.775rem', color: 'var(--primary-color, #1E3A8A)' }}>
              🔒 <strong>Security &amp; Compliance:</strong> Passwords, session tokens, secret keys, and raw authentication hashes are automatically sanitized and never included in data exports.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;

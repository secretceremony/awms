import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { apiClient } from '../../api/client.js';
import { Eye, Plus, Edit2, Trash2, AlertTriangle, Printer, Download, Loader2, CheckSquare, X } from 'lucide-react';
import { Button, PageHeader, Select, Input, ConfirmModal } from '../../components/ui/index.js';
import { FilterBar, FilterPanel, type ActiveFilter } from '../../components/filters/index.js';
import { ShippingLabelFormModal, type ShippingLabel } from '../../components/delivery/ShippingLabelFormModal.js';
import { ShippingLabelDetailModal } from '../../components/delivery/ShippingLabelDetailModal.js';
import { ShippingLabelPrintView } from '../../components/delivery/ShippingLabelPrintView.js';
import {
  downloadShippingLabelPdf,
  generateMultiShippingLabelsFilename,
} from '../../utils/shippingLabelPdf.js';

export const Labels: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const sourceType = searchParams.get('sourceType') || 'ALL';
  const isFragile = searchParams.get('isFragile') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Current page data & Multi-selection state
  const [currentPageLabels, setCurrentPageLabels] = useState<ShippingLabel[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Map<number, ShippingLabel>>(new Map());
  const [isBatchPdfGenerating, setIsBatchPdfGenerating] = useState(false);
  const batchPrintRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<ShippingLabel | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<ShippingLabel | null>(null);
  const [labelToDelete, setLabelToDelete] = useState<ShippingLabel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    if (!('page' in updates)) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
  };

  // Selection helpers
  const handleToggleSelect = (label: ShippingLabel) => {
    setSelectedLabels((prev) => {
      const next = new Map(prev);
      if (next.has(label.id)) {
        next.delete(label.id);
      } else {
        next.set(label.id, label);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    setSelectedLabels((prev) => {
      const next = new Map(prev);
      const allCurrentSelected = currentPageLabels.every((l) => next.has(l.id));
      if (allCurrentSelected) {
        currentPageLabels.forEach((l) => next.delete(l.id));
      } else {
        currentPageLabels.forEach((l) => next.set(l.id, l));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedLabels(new Map());
  };

  const isAllPageSelected =
    currentPageLabels.length > 0 && currentPageLabels.every((l) => selectedLabels.has(l.id));

  // Batch Print handler
  const handleBatchPrint = () => {
    const printContents = batchPrintRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open('', '_blank', 'width=850,height=650');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shipping Labels (${selectedLabels.size} Labels)</title>
            <style>
              @page {
                size: 150mm 100mm landscape;
                margin: 0;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #FFFFFF;
                color: #000000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .shipping-label-container {
                width: 150mm !important;
                height: 100mm !important;
                margin: 0 auto;
                page-break-after: always;
                break-after: page;
              }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Batch PDF Download handler
  const handleBatchDownloadPdf = async () => {
    if (!batchPrintRef.current) return;
    setIsBatchPdfGenerating(true);
    try {
      const filename = generateMultiShippingLabelsFilename(selectedLabels.size);
      await downloadShippingLabelPdf(batchPrintRef.current, filename);
    } catch (err) {
      console.error('Failed to download batch labels PDF:', err);
      alert('Failed to generate PDF. Please try printing directly.');
    } finally {
      setIsBatchPdfGenerating(false);
    }
  };

  const activeFilters: ActiveFilter[] = [];
  if (sourceType && sourceType !== 'ALL') {
    activeFilters.push({
      key: 'sourceType',
      label: 'Source',
      valueDisplay: sourceType === 'DO' ? 'From DO' : 'Standalone',
      onClear: () => updateFilters({ sourceType: null }),
    });
  }
  if (isFragile) {
    activeFilters.push({
      key: 'isFragile',
      label: 'Fragile',
      valueDisplay: isFragile === 'true' ? 'Fragile Only' : 'Standard',
      onClear: () => updateFilters({ isFragile: null }),
    });
  }
  if (startDate) {
    activeFilters.push({
      key: 'startDate',
      label: 'From',
      valueDisplay: startDate,
      onClear: () => updateFilters({ startDate: null }),
    });
  }
  if (endDate) {
    activeFilters.push({
      key: 'endDate',
      label: 'To',
      valueDisplay: endDate,
      onClear: () => updateFilters({ endDate: null }),
    });
  }

  const handleDeleteConfirm = async () => {
    if (!labelToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/shipping-labels/${labelToDelete.id}`);
      setSelectedLabels((prev) => {
        const next = new Map(prev);
        next.delete(labelToDelete.id);
        return next;
      });
      setLabelToDelete(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to delete shipping label:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<ShippingLabel>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={isAllPageSelected}
          onChange={handleSelectAllOnPage}
          title="Select all on current page"
          style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
        />
      ),
      key: 'select',
      render: (l) => (
        <input
          type="checkbox"
          checked={selectedLabels.has(l.id)}
          onChange={() => handleToggleSelect(l)}
          title={`Select label #${l.id}`}
          style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
        />
      ),
    },
    {
      header: 'Ship Date',
      key: 'shipDate',
      render: (l) => (
        <span style={{ fontSize: '0.8rem', color: '#4B5563', whiteSpace: 'nowrap' }}>
          {new Date(l.shipDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Recipient / Company',
      key: 'recipientName',
      render: (l) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1F2839' }}>{l.recipientName}</div>
          {l.attnName && (
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Attn: {l.attnName}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Destination',
      key: 'destination',
      render: (l) => (
        <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.destination}
        </div>
      ),
    },
    {
      header: 'Source / DO Number',
      key: 'doNumber',
      render: (l) => {
        if (l.sourceType === 'DO' && l.doNumber) {
          return (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                color: '#2250A1',
                backgroundColor: '#EFF6FF',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #BFDBFE',
              }}
            >
              {l.doNumber}
            </span>
          );
        }
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#4B5563',
              backgroundColor: '#F3F4F6',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            Standalone
          </span>
        );
      },
    },
    {
      header: 'Reference',
      key: 'referenceNumber',
      render: (l) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4B5563' }}>
          {l.referenceNumber || '-'}
        </span>
      ),
    },
    {
      header: 'Fragile',
      key: 'isFragile',
      render: (l) =>
        l.isFragile ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            <AlertTriangle size={11} /> FRAGILE
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Standard</span>
        ),
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (l) => (
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {l.createdBy?.name || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (l) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLabel(l)}
            title="View, Print & Download PDF"
          >
            <Eye size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingLabel(l);
              setIsFormModalOpen(true);
            }}
            title="Edit Label"
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLabelToDelete(l)}
            title="Delete Label"
            style={{ color: '#EF4444' }}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Shipping Labels"
        description="Generate, batch print, and download package shipping labels from issued delivery orders or standalone shipments."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditingLabel(null);
              setIsFormModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Generate Shipping Label
          </Button>
        }
      />

      {/* Multi-Selection Batch Action Bar */}
      {selectedLabels.size > 0 && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '6px',
            padding: '10px 16px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A8A', fontWeight: 600, fontSize: '0.9rem' }}>
            <CheckSquare size={18} color="#2250A1" />
            <span>
              <strong>{selectedLabels.size}</strong> shipping label(s) selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBatchDownloadPdf}
              disabled={isBatchPdfGenerating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {isBatchPdfGenerating ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              {isBatchPdfGenerating ? 'Generating...' : `Download Selected PDF (${selectedLabels.size})`}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchPrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={14} /> Print Selected ({selectedLabels.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              title="Clear selection"
              style={{ color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <X size={14} /> Clear
            </Button>
          </div>
        </div>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search recipient, destination, DO #, reference..."
        primaryFilter={
          <div style={{ width: '170px' }}>
            <Select
              value={sourceType}
              onChange={(e) => updateFilters({ sourceType: e.target.value })}
            >
              <option value="ALL">All Label Sources</option>
              <option value="DO">From Delivery Order</option>
              <option value="STANDALONE">Standalone</option>
            </Select>
          </div>
        }
        hasAdvancedFilters
        isAdvancedOpen={isAdvancedOpen}
        onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <FilterPanel isOpen={isAdvancedOpen}>
        <div style={{ width: '160px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            Package Handling
          </label>
          <Select
            value={isFragile}
            onChange={(e) => updateFilters({ isFragile: e.target.value })}
          >
            <option value="">All Packages</option>
            <option value="true">Fragile Only</option>
            <option value="false">Standard Only</option>
          </Select>
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            From Date
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
          />
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
            To Date
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => updateFilters({ endDate: e.target.value })}
          />
        </div>
      </FilterPanel>

      <PaginatedTable<ShippingLabel>
        fetchUrl="/shipping-labels"
        searchPlaceholder="Search recipient, destination, DO #, reference..."
        columns={columns}
        onDataLoaded={(data) => setCurrentPageLabels(data)}
        extraParams={{
          search: search || undefined,
          sourceType: sourceType !== 'ALL' ? sourceType : undefined,
          isFragile: isFragile || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          _refresh: refreshKey,
        }}
      />

      {/* Create / Edit Form Modal */}
      <ShippingLabelFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        shippingLabel={editingLabel}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />

      {/* Label Detail, Preview & Print Modal */}
      <ShippingLabelDetailModal
        isOpen={selectedLabel !== null}
        onClose={() => setSelectedLabel(null)}
        shippingLabel={selectedLabel}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={labelToDelete !== null}
        onClose={() => setLabelToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Shipping Label"
        message={
          labelToDelete
            ? `Are you sure you want to delete shipping label for "${labelToDelete.recipientName}"?`
            : ''
        }
        confirmText="Delete Label"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Hidden Container for Batch Printing and Multi-Label PDF Export */}
      <div style={{ display: 'none' }}>
        <div ref={batchPrintRef}>
          {Array.from(selectedLabels.values()).map((l) => (
            <ShippingLabelPrintView key={l.id} label={l} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Labels;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { DeliveryOrderPrintView } from '../../components/delivery/DeliveryOrderPrintView.js';
import { Button } from '../../components/ui/index.js';
import { ArrowLeft, Printer, Download, AlertCircle, Loader2 } from 'lucide-react';
import { generateDoPdfFilename, downloadDeliveryOrderPdf } from '../../utils/deliveryOrderPdf.js';

export const DeliveryOrderPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [deliveryOrder, setDeliveryOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDO = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await apiClient.get(`/delivery-orders/${id}`);
        setDeliveryOrder(data);
      } catch (err: any) {
        console.error('Failed to load Delivery Order for printing:', err);
        setErrorMsg(err.message || 'Failed to load Delivery Order details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDO();
  }, [id]);

  const handlePrint = async () => {
    if (!deliveryOrder) return;
    try {
      await apiClient.post(`/delivery-orders/${deliveryOrder.id}/print`);
    } catch (err) {
      console.warn('Failed to log print audit:', err);
    }
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!deliveryOrder || !printContainerRef.current) return;
    setIsDownloadingPdf(true);
    setPdfError(null);
    try {
      const filename = generateDoPdfFilename(deliveryOrder.doNumber, deliveryOrder.id);
      await downloadDeliveryOrderPdf(printContainerRef.current, filename);
      try {
        await apiClient.post(`/delivery-orders/${deliveryOrder.id}/print`);
      } catch (err) {
        console.warn('Failed to log print audit:', err);
      }
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err.message || 'Failed to generate PDF file. Please try browser Print.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} color="#2250A1" />
        <span style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}>Loading Delivery Order document...</span>
      </div>
    );
  }

  if (errorMsg || !deliveryOrder) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '1.5rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', textAlign: 'center' }}>
        <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ margin: '0 0 8px', color: '#991B1B' }}>Delivery Order Not Found</h3>
        <p style={{ color: '#B91C1C', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{errorMsg || 'Could not find the requested Delivery Order record.'}</p>
        <Button variant="secondary" onClick={() => navigate('/delivery-orders')}>
          <ArrowLeft size={16} /> Back to Delivery Orders
        </Button>
      </div>
    );
  }

  const isDraft = deliveryOrder.status === 'DRAFT';

  return (
    <div className="print-page-wrapper">
      {/* Floating Action Header (Hidden in Print) */}
      <div className="no-print print-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B' }}>
              {isDraft ? 'Delivery Order Draft' : `DO: ${deliveryOrder.doNumber || 'Issued'}`}
            </span>
            {isDraft ? (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', backgroundColor: '#FEF3C7', color: '#B45309', borderRadius: '12px' }}>
                Draft
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: '12px' }}>
                Issued
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {pdfError && (
            <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 500 }}>
              {pdfError}
            </span>
          )}
          {!isDraft ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Print Document
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isDownloadingPdf}
                onClick={handleDownloadPdf}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="animate-spin" size={15} /> Preparing PDF...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Download PDF
                  </>
                )}
              </Button>
            </>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#92400E', backgroundColor: '#FEF3C7', padding: '4px 10px', borderRadius: '4px' }}>
              Issue this draft to enable official print & PDF download
            </span>
          )}
        </div>
      </div>

      {/* Document Sheet Container */}
      <div className="print-document-container">
        <div ref={printContainerRef} className="print-sheet-a4-landscape">
          <DeliveryOrderPrintView deliveryOrder={deliveryOrder} />
        </div>
      </div>
    </div>
  );
};

export default DeliveryOrderPrintPage;

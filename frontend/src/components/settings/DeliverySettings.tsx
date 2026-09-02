import React, { useState, useEffect } from 'react';
import { FormField, Input, Textarea, Button, Card } from '../ui/index.js';
import { apiClient } from '../../api/client.js';


export const DeliverySettings: React.FC = () => {
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [labelWidth, setLabelWidth] = useState('100mm');
  const [labelHeight, setLabelHeight] = useState('150mm');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const data: any = await apiClient.get('/settings');
        if (data?.delivery) {
          setSenderName(data.delivery.senderName || '');
          setSenderAddress(data.delivery.senderAddress || '');
          setSenderPhone(data.delivery.senderPhone || '');
          setLabelWidth(data.delivery.labelWidth || '100mm');
          setLabelHeight(data.delivery.labelHeight || '150mm');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load delivery settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    setIsSaving(true);
    try {
      await apiClient.patch('/settings/delivery', {
        senderName: senderName.trim(),
        senderAddress: senderAddress.trim(),
        senderPhone: senderPhone.trim(),
        labelWidth: labelWidth.trim(),
        labelHeight: labelHeight.trim(),
      });
      setSuccessMsg('Delivery defaults saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save delivery defaults');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1F2839' }}>
          Delivery & Shipping Defaults
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
          Configure default dispatch sender information and standard dimensions for generated shipping labels.
        </p>
      </div>

      {successMsg && <div className="alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}
      {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

      <Card>
        <form onSubmit={handleSave}>
          <FormField label="Default Sender Company Name" required>
            <Input
              type="text"
              required
              disabled={isLoading}
              placeholder="e.g. PT Alssa Logistics Indonesia"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </FormField>

          <FormField label="Default Sender Address" required>
            <Textarea
              required
              disabled={isLoading}
              placeholder="e.g. Jl. Mulawarman No. 23, Balikpapan..."
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
            />
          </FormField>

          <FormField label="Default Sender Contact Phone">
            <Input
              type="text"
              disabled={isLoading}
              placeholder="e.g. +62 542 876543"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
            />
          </FormField>

          <div className="form-grid">
            <FormField label="Default Label Width" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                disabled={isLoading}
                placeholder="e.g. 100mm"
                value={labelWidth}
                onChange={(e) => setLabelWidth(e.target.value)}
              />
            </FormField>

            <FormField label="Default Label Height" style={{ marginBottom: 0 }}>
              <Input
                type="text"
                disabled={isLoading}
                placeholder="e.g. 150mm"
                value={labelHeight}
                onChange={(e) => setLabelHeight(e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" type="submit" isLoading={isSaving} disabled={isLoading}>
              Save Delivery Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

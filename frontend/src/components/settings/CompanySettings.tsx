import React, { useState, useEffect } from 'react';
import { FormField, Input, Textarea, Button, Card } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { Building, MapPin, Save, Loader2 } from 'lucide-react';

export const CompanySettings: React.FC = () => {
  const [companyName, setCompanyName] = useState('PT ALSSA Corporindo');
  const [jktOfficeName, setJktOfficeName] = useState('Head Office (Jakarta)');
  const [jktAddress, setJktAddress] = useState('');
  const [jktPhone, setJktPhone] = useState('');
  const [jktEmail, setJktEmail] = useState('');

  const [bpnOfficeName, setBpnOfficeName] = useState('Branch Office (Balikpapan)');
  const [bpnAddress, setBpnAddress] = useState('');
  const [bpnPhone, setBpnPhone] = useState('');
  const [bpnEmail, setBpnEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const data: any = await apiClient.get('/settings');
        if (data?.company) {
          setCompanyName(data.company.companyName || 'PT ALSSA Corporindo');
          setJktOfficeName(data.company.jktOfficeName || 'Head Office (Jakarta)');
          setJktAddress(data.company.jktAddress || '');
          setJktPhone(data.company.jktPhone || '');
          setJktEmail(data.company.jktEmail || '');
          setBpnOfficeName(data.company.bpnOfficeName || 'Branch Office (Balikpapan)');
          setBpnAddress(data.company.bpnAddress || '');
          setBpnPhone(data.company.bpnPhone || '');
          setBpnEmail(data.company.bpnEmail || '');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load company identity settings');
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
      await apiClient.patch('/settings/company', {
        companyName: companyName.trim(),
        jktOfficeName: jktOfficeName.trim(),
        jktAddress: jktAddress.trim(),
        jktPhone: jktPhone.trim(),
        jktEmail: jktEmail.trim(),
        bpnOfficeName: bpnOfficeName.trim(),
        bpnAddress: bpnAddress.trim(),
        bpnPhone: bpnPhone.trim(),
        bpnEmail: bpnEmail.trim(),
      });
      setSuccessMsg('Company addresses and identity saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save company settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1F2839' }}>
          Company Identity & Office Addresses
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
          Edit the official company legal name, Jakarta head office address, and Balikpapan branch address printed on Delivery Orders and Shipping Labels.
        </p>
      </div>

      {successMsg && <div className="alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}
      {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

      <Card>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #E2E8F0' }}>
            <FormField label="Company Legal Name" required>
              <Input
                type="text"
                required
                disabled={isLoading}
                placeholder="e.g. PT ALSSA Corporindo"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </FormField>
          </div>

          {/* Jakarta Head Office Section */}
          <div style={{ marginBottom: '1.75rem', padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <Building size={18} style={{ color: '#2250A1' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                Jakarta Head Office
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Office Title" required>
                <Input
                  type="text"
                  required
                  disabled={isLoading}
                  value={jktOfficeName}
                  onChange={(e) => setJktOfficeName(e.target.value)}
                />
              </FormField>

              <FormField label="Phone Number">
                <Input
                  type="text"
                  disabled={isLoading}
                  placeholder="e.g. +6221 8010035 / +6221 8010033"
                  value={jktPhone}
                  onChange={(e) => setJktPhone(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Full Printed Address (Jakarta)" required>
              <Textarea
                required
                rows={3}
                disabled={isLoading}
                placeholder="Rukan Tanjung Mas Raya, Jalan Raya Lenteng Agung Blok B1 No. 3..."
                value={jktAddress}
                onChange={(e) => setJktAddress(e.target.value)}
              />
            </FormField>

            <FormField label="Contact Email">
              <Input
                type="email"
                disabled={isLoading}
                placeholder="info@alssacorp.co.id"
                value={jktEmail}
                onChange={(e) => setJktEmail(e.target.value)}
              />
            </FormField>
          </div>

          {/* Balikpapan Branch Office Section */}
          <div style={{ marginBottom: '1.75rem', padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <MapPin size={18} style={{ color: '#0891B2' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                Balikpapan Branch Office
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Office Title" required>
                <Input
                  type="text"
                  required
                  disabled={isLoading}
                  value={bpnOfficeName}
                  onChange={(e) => setBpnOfficeName(e.target.value)}
                />
              </FormField>

              <FormField label="Phone Number">
                <Input
                  type="text"
                  disabled={isLoading}
                  placeholder="e.g. +6221 8010035"
                  value={bpnPhone}
                  onChange={(e) => setBpnPhone(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Full Printed Address (Balikpapan)" required>
              <Textarea
                required
                rows={3}
                disabled={isLoading}
                placeholder="Balikpapan Baru, Cluster Orlando Blok DB No. 3..."
                value={bpnAddress}
                onChange={(e) => setBpnAddress(e.target.value)}
              />
            </FormField>

            <FormField label="Contact Email">
              <Input
                type="email"
                disabled={isLoading}
                placeholder="info@alssacorp.co.id"
                value={bpnEmail}
                onChange={(e) => setBpnEmail(e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              type="submit"
              disabled={isSaving || isLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving Changes...' : 'Save Company Identity'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CompanySettings;

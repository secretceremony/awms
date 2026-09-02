import React, { useState, useEffect } from 'react';
import { FormField, Input, Button, Card } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const InventorySettings: React.FC = () => {
  const [threshold, setThreshold] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const data: any = await apiClient.get('/settings');
        if (data?.inventory?.lowStockThreshold !== undefined) {
          setThreshold(data.inventory.lowStockThreshold);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load inventory settings');
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

    if (threshold < 1) {
      setErrorMsg('Low stock threshold must be at least 1');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.patch('/settings/inventory', {
        lowStockThreshold: threshold,
      });
      setSuccessMsg('Inventory threshold saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save inventory threshold');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1F2839' }}>
          Inventory Stock Indicators
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
          Configure global thresholds for bulk inventory warnings and dashboard stock status badges.
        </p>
      </div>

      {successMsg && <div className="alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}
      {errorMsg && <div className="alert-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

      <Card>
        <form onSubmit={handleSave}>
          <FormField
            label="Global Low Stock Threshold (Bulk Items)"
            required
          >
            <Input
              type="number"
              min="1"
              required
              disabled={isLoading}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 1)}
              style={{ maxWidth: '200px', fontWeight: 600, fontSize: '1rem' }}
            />
          </FormField>

          {/* Status Indicator Legend */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
              Indicator Preview:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 700, fontSize: '0.75rem' }}>
                  <AlertCircle size={12} /> Out of Stock
                </span>
                <span style={{ color: '#6B7280' }}>— Quantity is 0</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700, fontSize: '0.75rem' }}>
                  <AlertTriangle size={12} /> Low Stock
                </span>
                <span style={{ color: '#6B7280' }}>— Quantity is between 1 and {threshold}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#D1FAE5', color: '#047857', fontWeight: 700, fontSize: '0.75rem' }}>
                  <CheckCircle2 size={12} /> Normal
                </span>
                <span style={{ color: '#6B7280' }}>— Quantity is greater than {threshold}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" type="submit" isLoading={isSaving} disabled={isLoading}>
              Save Threshold
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

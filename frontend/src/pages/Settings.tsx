import React, { useState } from 'react';
import { PageHeader, Card, FormField, Input, NumberInput, Button } from '../components/ui/index.js';

export const Settings = () => {
  const [appTitle, setAppTitle] = useState('AWMS Corporate Portal');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [sessionTimeout, setSessionTimeout] = useState(8);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="System Preferences"
        description="Configure general portal parameters and operational thresholds."
      />

      <Card>
        {successMsg && (
          <div className="alert-success">
            Settings saved successfully.
          </div>
        )}

        <form onSubmit={handleSave} style={{ maxWidth: '600px' }}>
          <FormField label="Application Title">
            <Input
              type="text"
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
            />
          </FormField>

          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <FormField label="Low Stock Alert Threshold" style={{ marginBottom: 0 }}>
              <NumberInput
                value={lowStockThreshold}
                onChange={(val) => setLowStockThreshold(val)}
              />
            </FormField>

            <FormField label="Session Inactivity Timeout (Hours)" style={{ marginBottom: 0 }}>
              <NumberInput
                value={sessionTimeout}
                onChange={(val) => setSessionTimeout(val)}
              />
            </FormField>
          </div>

          <Button type="submit" variant="primary">
            Save Preferences
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Settings;

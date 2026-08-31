import React, { useState } from 'react';
import './Settings.css';

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
      <div className="content-card">
        <h3>System Preferences</h3>
        <p>Configure general parameters of the ALSSA Warehouse Management System portal.</p>

        {successMsg && (
          <div className="settings-success-alert">
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group-settings">
            <label htmlFor="appTitle">Application Title</label>
            <input
              id="appTitle"
              type="text"
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
            />
          </div>

          <div className="form-row-settings">
            <div className="form-group-settings">
              <label htmlFor="lowStockThreshold">Low Stock Alert Threshold</label>
              <input
                id="lowStockThreshold"
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              />
            </div>

            <div className="form-group-settings">
              <label htmlFor="sessionTimeout">Session Inactivity Timeout (Hours)</label>
              <input
                id="sessionTimeout"
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
              />
            </div>
          </div>

          <button type="submit" className="btn-save-settings">
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  );
};

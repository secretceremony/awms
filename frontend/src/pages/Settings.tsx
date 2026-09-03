import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/index.js';
import { CitySettings } from '../components/settings/CitySettings.js';
import { UnitSettings } from '../components/settings/UnitSettings.js';
import { InventorySettings } from '../components/settings/InventorySettings.js';
import { DataExportSettings } from '../components/settings/DataExportSettings.js';
import { CompanySettings } from '../components/settings/CompanySettings.js';
import { MapPin, Ruler, Boxes, FileSpreadsheet, Building2 } from 'lucide-react';

type SettingsTab = 'company' | 'cities' | 'units' | 'inventory' | 'export';

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'company';
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    ['company', 'cities', 'units', 'inventory', 'export'].includes(initialTab) ? initialTab : 'company',
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && ['company', 'cities', 'units', 'inventory', 'export'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }> }> = [
    { id: 'company', label: 'Company & Addresses', icon: Building2 },
    { id: 'cities', label: 'Cities', icon: MapPin },
    { id: 'units', label: 'Units', icon: Ruler },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'export', label: 'Data Export', icon: FileSpreadsheet },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="System Settings"
        description="Configure company identities, office addresses, reference cities, units of measurement, inventory thresholds, and data exports"
      />

      {/* Settings Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid #E5E7EB',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          whiteSpace: 'nowrap',
        }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderBottom: isActive ? '2px solid #2250A1' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#2250A1' : '#6B7280',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} style={{ color: isActive ? '#2250A1' : '#9CA3AF' }} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'cities' && <CitySettings />}
        {activeTab === 'units' && <UnitSettings />}
        {activeTab === 'inventory' && <InventorySettings />}
        {activeTab === 'export' && <DataExportSettings />}
      </div>
    </div>
  );
};

export default Settings;

import React, { useState, useEffect, useRef } from 'react';
import { Input, Button } from '../ui/index.js';
import { Plus, Check, Warehouse as WarehouseIcon } from 'lucide-react';
import { apiClient } from '../../api/client.js';

export interface InventoryItemOption {
  id: string;
  trackingType: 'BULK' | 'SERIALIZED';
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  warehouseId: number;
  warehouseName: string;
  cityCode: string;
  availableQty: number;
  unit: string;
  unitSymbol: string;
  itemSerialId?: number;
  serialNumber?: string;
  condition?: string;
}

export interface InventoryPickerProps {
  onSelectItem: (item: InventoryItemOption) => void;
  selectedItemKeys?: string[];
  lockedWarehouseId?: number | null;
  lockedWarehouseName?: string | null;
  searchPlaceholder?: string;
  height?: string;
}

export const InventoryPicker: React.FC<InventoryPickerProps> = ({
  onSelectItem,
  selectedItemKeys = [],
  lockedWarehouseId = null,
  lockedWarehouseName = null,
  searchPlaceholder = 'Search item name, brand, model number, serial number, warehouse...',
  height = '240px',
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [inventory, setInventory] = useState<InventoryItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch available inventory
  useEffect(() => {
    let isCurrent = true;
    const fetchInv = async () => {
      setIsLoading(true);
      try {
        const res: any = await apiClient.get('/stock-movements/available-inventory', {
          params: {
            search: debouncedSearch || undefined,
            warehouseId: lockedWarehouseId || undefined,
          },
        });
        if (isCurrent) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setInventory(list);
        }
      } catch (err) {
        console.error('Failed to load available inventory:', err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    fetchInv();
    return () => {
      isCurrent = false;
    };
  }, [debouncedSearch, lockedWarehouseId]);

  return (
    <div
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Search Header */}
      <div
        style={{
          padding: '8px 10px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '6px 10px' }}
          />
        </div>
        {lockedWarehouseId && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#EFF6FF',
              color: '#2250A1',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <WarehouseIcon size={12} /> {lockedWarehouseName || `Hub #${lockedWarehouseId}`}
          </div>
        )}
      </div>

      {/* Scrollable Inventory List */}
      <div style={{ maxHeight: height, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
            Loading available inventory...
          </div>
        ) : inventory.length === 0 ? (
          <div style={{ padding: '1.75rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
            {search ? (
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#334155' }}>
                  No inventory matches "{search}"
                </p>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Try adjusting your search terms or checking a different Source Hub.
                </span>
              </div>
            ) : lockedWarehouseId ? (
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#334155' }}>
                  No available stock found in {lockedWarehouseName || `Hub #${lockedWarehouseId}`}
                </p>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Please select another Source Hub or verify physical stock balances.
                </span>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#334155' }}>
                  No available stock found in warehouses
                </p>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Record Incoming or Initial Stock before dispatching.
                </span>
              </div>
            )}
          </div>
        ) : (
          <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, backgroundColor: '#F1F5F9', zIndex: 1 }}>
                <th>Item &amp; Details</th>
                <th>Hub / Warehouse</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Type</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Available</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isSelected = selectedItemKeys.includes(item.id);
                const isWarehouseMismatched =
                  lockedWarehouseId !== null && lockedWarehouseId !== item.warehouseId;

                return (
                  <tr
                    key={item.id}
                    style={{
                      opacity: isWarehouseMismatched ? 0.45 : 1,
                      backgroundColor: isSelected ? '#F0FDF4' : undefined,
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{item.itemName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {item.brand && `${item.brand} `}
                        {item.modelNumber && `| MN: ${item.modelNumber}`}
                        {item.serialNumber && (
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2250A1', marginLeft: '6px' }}>
                            SN: {item.serialNumber} {item.condition ? `(${item.condition})` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                        {item.warehouseName} <strong>[{item.cityCode}]</strong>
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          backgroundColor: item.trackingType === 'SERIALIZED' ? '#F5F3FF' : '#F1F5F9',
                          color: item.trackingType === 'SERIALIZED' ? '#7C3AED' : '#475569',
                        }}
                      >
                        {item.trackingType}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.availableQty} {item.unitSymbol}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <Button
                        type="button"
                        variant={isSelected ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={isWarehouseMismatched || isSelected}
                        onClick={() => onSelectItem(item)}
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        {isSelected ? (
                          <>
                            <Check size={12} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={12} /> Add
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

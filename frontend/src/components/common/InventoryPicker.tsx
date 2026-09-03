import React, { useState, useEffect, useRef } from 'react';
import { Input, Button } from '../ui/index.js';
import { Plus, Check, Info } from 'lucide-react';
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
  searchPlaceholder = 'Search item name, brand, model, SN, or hub...',
  height = '230px',
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [inventory, setInventory] = useState<InventoryItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
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
      {/* Source Hub Lock Banner (Contextual Information, not an error) */}
      {lockedWarehouseId && (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            padding: '6px 12px',
            fontSize: '0.75rem',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Info size={14} color="#2250A1" />
          <span>
            Source Hub locked to <strong>{lockedWarehouseName || `Hub #${lockedWarehouseId}`}</strong> &mdash; Only inventory from this warehouse can be included in this transaction.
          </span>
        </div>
      )}

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
            style={{ fontSize: '0.825rem', padding: '5px 8px' }}
          />
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {inventory.length} available
        </div>
      </div>

      {/* Scrollable Inventory List with Sticky Table Header */}
      <div style={{ maxHeight: height, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.825rem' }}>
            Loading available warehouse inventory...
          </div>
        ) : inventory.length === 0 ? (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.825rem' }}>
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
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="data-table" style={{ margin: 0, fontSize: '0.8rem', width: '100%', minWidth: '420px' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, backgroundColor: '#F1F5F9', zIndex: 1 }}>
                  <th style={{ padding: '6px 8px' }}>Item &amp; Details</th>
                  <th style={{ padding: '6px 8px' }}>Hub / Location</th>
                  <th style={{ width: '70px', textAlign: 'center', padding: '6px 8px' }}>Type</th>
                  <th style={{ width: '85px', textAlign: 'right', padding: '6px 8px' }}>Available</th>
                  <th style={{ width: '75px', textAlign: 'center', padding: '6px 8px' }}>Action</th>
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
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{item.itemName}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748B' }}>
                        {item.brand && `${item.brand} `}
                        {item.modelNumber && `[MN: ${item.modelNumber}] `}
                        {item.serialNumber && (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#2250A1',
                              backgroundColor: '#EFF6FF',
                              padding: '1px 4px',
                              borderRadius: '3px',
                            }}
                          >
                            SN: {item.serialNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ fontSize: '0.775rem', color: '#334155' }}>
                        {item.warehouseName} <strong>[{item.cityCode}]</strong>
                      </span>
                    </td>

                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                      <span
                        className={`badge-pill ${
                          item.trackingType === 'SERIALIZED' ? 'tracking-serialized' : 'tracking-bulk'
                        } badge-sm`}
                      >
                        {item.trackingType === 'SERIALIZED' ? 'SERIAL' : 'BULK'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600, padding: '6px 8px' }}>
                      {item.availableQty} {item.unitSymbol}
                    </td>

                    <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                      <Button
                        type="button"
                        variant={isSelected ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={isWarehouseMismatched || isSelected}
                        onClick={() => onSelectItem(item)}
                        style={{ padding: '2px 7px', fontSize: '0.725rem' }}
                      >
                        {isSelected ? (
                          <>
                            <Check size={11} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={11} /> Add
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPicker;

import React, { useState, useEffect } from 'react';
import {
  Modal,
  FormField,
  Input,
  Select,
  Button,
} from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import {
  Warehouse as WarehouseIcon,
  Trash2,
} from 'lucide-react';

export interface ProjectOption {
  id: number;
  name: string;
  location: string;
  siteCode: string | null;
  referenceNumber: string | null;
  status: string;
  client?: {
    id: number;
    name: string;
    clientType: string;
  };
  clientContact?: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

export interface AvailableInventoryItem {
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

export interface SelectedDoItem {
  itemId: number;
  itemName: string;
  brand: string | null;
  modelNumber: string | null;
  trackingType: 'BULK' | 'SERIALIZED';
  unit: string;
  unitSymbol: string;
  warehouseId: number;
  warehouseName: string;
  cityCode: string;
  quantity: number;
  maxAvailable: number;
  pic?: string;
  remarks?: string;
  serialNumbers?: string[];
  selectedSerials?: Array<{ id: number; serialNumber: string; condition?: string }>;
}

export interface DeliveryOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryOrderId?: number | null;
  onSuccess: () => void;
}

export const DeliveryOrderFormModal: React.FC<DeliveryOrderFormModalProps> = ({
  isOpen,
  onClose,
  deliveryOrderId,
  onSuccess,
}) => {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [doDate, setDoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activity, setActivity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [establishedWarehouseId, setEstablishedWarehouseId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedDoItem[]>([]);

  // Inventory Search State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<AvailableInventoryItem[]>([]);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  // Serial picker modal / sub-selection state
  const [pickerItem, setPickerItem] = useState<AvailableInventoryItem | null>(null);
  const [bulkQtyInput, setBulkQtyInput] = useState<number>(1);
  const [itemPicInput, setItemPicInput] = useState<string>('');
  const [itemRemarksInput, setItemRemarksInput] = useState<string>('');
  const [selectedSnMap, setSelectedSnMap] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch active projects on open
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res: any = await apiClient.get('/projects', {
          params: { status: 'ACTIVE', limit: 100 },
        });
        const list: ProjectOption[] = Array.isArray(res) ? res : res?.data || [];
        setProjects(list);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Load existing draft if editing
  useEffect(() => {
    const loadDraft = async () => {
      if (!deliveryOrderId || !isOpen) {
        if (!deliveryOrderId) {
          setSelectedProjectId('');
          setDoDate(new Date().toISOString().split('T')[0]);
          setActivity('');
          setNotes('');
          setEstablishedWarehouseId(null);
          setSelectedItems([]);
          setErrorMsg(null);
        }
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data: any = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
        setSelectedProjectId(String(data.projectId));
        setDoDate(new Date(data.date).toISOString().split('T')[0]);
        setActivity(data.activity || '');
        setNotes(data.notes || '');
        setEstablishedWarehouseId(data.sourceWarehouseId || null);

        const itemsMapped: SelectedDoItem[] = (data.items || []).map((i: any) => ({
          itemId: i.itemId,
          itemName: i.itemName || i.item?.name,
          brand: i.brand || i.item?.brand,
          modelNumber: i.modelNumber || i.item?.modelNumber,
          trackingType: i.trackingType || i.item?.trackingType,
          unit: i.unitName || i.item?.unit?.name || 'pcs',
          unitSymbol: i.unitSymbol || i.item?.unit?.symbol || 'pcs',
          warehouseId: data.sourceWarehouseId,
          warehouseName: data.sourceWarehouse?.name || '',
          cityCode: data.sourceWarehouse?.cityCode || '',
          quantity: i.quantity,
          maxAvailable: i.quantity + 100, // baseline for draft
          pic: i.pic || '',
          remarks: i.remarks || '',
          serialNumbers: (i.itemSerials || []).map((s: any) => s.serialNumber || s.itemSerial?.serialNumber),
          selectedSerials: (i.itemSerials || []).map((s: any) => ({
            id: s.itemSerialId,
            serialNumber: s.serialNumber || s.itemSerial?.serialNumber,
            condition: s.conditionLabel || s.itemSerial?.conditionLabel,
          })),
        }));

        setSelectedItems(itemsMapped);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to load draft details');
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [deliveryOrderId, isOpen]);

  // Search available inventory
  useEffect(() => {
    const searchInventory = async () => {
      if (!isOpen) return;
      setIsSearchingInventory(true);
      try {
        const params: Record<string, any> = {};
        if (establishedWarehouseId) {
          params.warehouseId = establishedWarehouseId;
        }
        if (inventorySearch.trim()) {
          params.search = inventorySearch.trim();
        }

        const res: any = await apiClient.get('/stock-movements/available-inventory', { params });
        setInventoryResults(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error('Failed to search available inventory:', err);
      } finally {
        setIsSearchingInventory(false);
      }
    };

    const timer = setTimeout(searchInventory, 250);
    return () => clearTimeout(timer);
  }, [isOpen, establishedWarehouseId, inventorySearch]);

  const selectedProject = projects.find((p) => String(p.id) === selectedProjectId);

  // Handle Project Selection
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    setErrorMsg(null);

    const matched = projects.find((p) => String(p.id) === projId);
    if (matched && (!matched.referenceNumber || !matched.referenceNumber.trim())) {
      setErrorMsg(
        'This project requires a Reference Number before a Delivery Order can be created.',
      );
    }
  };

  // Open item selection drawer/picker
  const handleSelectItemForAdd = (item: AvailableInventoryItem) => {
    if (establishedWarehouseId && establishedWarehouseId !== item.warehouseId) {
      setErrorMsg(
        `All items in this DO must come from the established warehouse [${item.cityCode}]. Mixed warehouses are rejected.`,
      );
      return;
    }

    setPickerItem(item);
    setBulkQtyInput(1);
    setItemPicInput('');
    setItemRemarksInput('');
    setSelectedSnMap({});
    setErrorMsg(null);
  };

  // Add Bulk Item to Selected
  const handleConfirmAddBulk = () => {
    if (!pickerItem) return;
    if (bulkQtyInput <= 0) {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }
    if (bulkQtyInput > pickerItem.availableQty) {
      setErrorMsg(
        `Quantity cannot exceed available warehouse stock (${pickerItem.availableQty} ${pickerItem.unitSymbol})`,
      );
      return;
    }

    // Set established warehouse
    if (!establishedWarehouseId) {
      setEstablishedWarehouseId(pickerItem.warehouseId);
    }

    const existingIndex = selectedItems.findIndex((i) => i.itemId === pickerItem.itemId);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity = bulkQtyInput;
      updated[existingIndex].pic = itemPicInput.trim() || undefined;
      updated[existingIndex].remarks = itemRemarksInput.trim() || undefined;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          itemId: pickerItem.itemId,
          itemName: pickerItem.itemName,
          brand: pickerItem.brand,
          modelNumber: pickerItem.modelNumber,
          trackingType: 'BULK',
          unit: pickerItem.unit,
          unitSymbol: pickerItem.unitSymbol,
          warehouseId: pickerItem.warehouseId,
          warehouseName: pickerItem.warehouseName,
          cityCode: pickerItem.cityCode,
          quantity: bulkQtyInput,
          maxAvailable: pickerItem.availableQty,
          pic: itemPicInput.trim() || undefined,
          remarks: itemRemarksInput.trim() || undefined,
        },
      ]);
    }

    setPickerItem(null);
  };

  // Add Serialized Item to Selected
  const handleConfirmAddSerialized = (groupedSerials: AvailableInventoryItem[]) => {
    if (!pickerItem) return;

    const chosenSnKeys = Object.keys(selectedSnMap).filter((sn) => selectedSnMap[sn]);
    if (chosenSnKeys.length === 0) {
      setErrorMsg('Please select at least one serial number');
      return;
    }

    if (!establishedWarehouseId) {
      setEstablishedWarehouseId(pickerItem.warehouseId);
    }

    const chosenSerials = groupedSerials
      .filter((s) => chosenSnKeys.includes(s.serialNumber || ''))
      .map((s) => ({
        id: s.itemSerialId!,
        serialNumber: s.serialNumber!,
        condition: s.condition,
      }));

    const existingIndex = selectedItems.findIndex((i) => i.itemId === pickerItem.itemId);
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity = chosenSerials.length;
      updated[existingIndex].serialNumbers = chosenSerials.map((s) => s.serialNumber);
      updated[existingIndex].selectedSerials = chosenSerials;
      updated[existingIndex].pic = itemPicInput.trim() || undefined;
      updated[existingIndex].remarks = itemRemarksInput.trim() || undefined;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          itemId: pickerItem.itemId,
          itemName: pickerItem.itemName,
          brand: pickerItem.brand,
          modelNumber: pickerItem.modelNumber,
          trackingType: 'SERIALIZED',
          unit: pickerItem.unit,
          unitSymbol: pickerItem.unitSymbol,
          warehouseId: pickerItem.warehouseId,
          warehouseName: pickerItem.warehouseName,
          cityCode: pickerItem.cityCode,
          quantity: chosenSerials.length,
          maxAvailable: groupedSerials.length,
          pic: itemPicInput.trim() || undefined,
          remarks: itemRemarksInput.trim() || undefined,
          serialNumbers: chosenSerials.map((s) => s.serialNumber),
          selectedSerials: chosenSerials,
        },
      ]);
    }

    setPickerItem(null);
  };

  const handleRemoveItem = (itemId: number) => {
    const filtered = selectedItems.filter((i) => i.itemId !== itemId);
    setSelectedItems(filtered);
    if (filtered.length === 0) {
      setEstablishedWarehouseId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProjectId) {
      setErrorMsg('Please select a destination Project');
      return;
    }

    if (!selectedProject?.referenceNumber || !selectedProject.referenceNumber.trim()) {
      setErrorMsg(
        'This project requires a Reference Number before a Delivery Order can be created.',
      );
      return;
    }

    if (!activity.trim()) {
      setErrorMsg('Activity is required');
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMsg('At least one item is required in Delivery Order');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        projectId: Number(selectedProjectId),
        date: doDate,
        activity: activity.trim(),
        notes: notes.trim() || undefined,
        items: selectedItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          pic: i.pic || undefined,
          remarks: i.remarks || undefined,
          serialNumbers: i.serialNumbers || undefined,
        })),
      };

      if (deliveryOrderId) {
        await apiClient.patch(`/delivery-orders/${deliveryOrderId}/draft`, payload);
      } else {
        await apiClient.post('/delivery-orders/draft', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save Delivery Order draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Grouped inventory for list display
  const groupedInventory: { [key: string]: AvailableInventoryItem[] } = {};
  inventoryResults.forEach((inv) => {
    const key = `${inv.warehouseId}-${inv.itemId}`;
    if (!groupedInventory[key]) {
      groupedInventory[key] = [];
    }
    groupedInventory[key].push(inv);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={deliveryOrderId ? 'Edit Delivery Order Draft' : 'Create Delivery Order Draft'}
      maxWidth="880px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Section 1: Project & Metadata */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#1F2839' }}>
              1. Destination Project & Logistics Header
            </h4>

            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <FormField label="Destination Project" required style={{ marginBottom: 0 }}>
                <Select
                  required
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                >
                  <option value="">Select Active Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.siteCode ? `[${p.siteCode}]` : ''} {p.client ? `— ${p.client.name}` : ''}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="DO Date" required style={{ marginBottom: 0 }}>
                <Input
                  type="date"
                  required
                  value={doDate}
                  onChange={(e) => setDoDate(e.target.value)}
                />
              </FormField>
            </div>

            {/* Auto-filled Read-Only Metadata Card */}
            {selectedProject && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  padding: '1rem',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: '#6B7280', fontSize: '0.75rem', display: 'block' }}>
                    Client / Company
                  </span>
                  <span style={{ fontWeight: 600, color: '#1F2839' }}>
                    {selectedProject.client?.name || '—'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#6B7280', fontSize: '0.75rem', display: 'block' }}>
                    Client Type
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      backgroundColor:
                        selectedProject.client?.clientType === 'PHM'
                          ? 'rgba(34, 80, 161, 0.1)'
                          : '#E5E7EB',
                      color:
                        selectedProject.client?.clientType === 'PHM' ? '#2250A1' : '#374151',
                    }}
                  >
                    {selectedProject.client?.clientType || 'OTHER'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#6B7280', fontSize: '0.75rem', display: 'block' }}>
                    Reference Number (PO / Contract)
                  </span>
                  {selectedProject.referenceNumber ? (
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#2250A1',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedProject.referenceNumber}
                    </span>
                  ) : (
                    <span style={{ color: '#EF4444', fontWeight: 600 }}>Missing (Blocked)</span>
                  )}
                </div>

                <div>
                  <span style={{ color: '#6B7280', fontSize: '0.75rem', display: 'block' }}>
                    Attn / Client PIC
                  </span>
                  <span style={{ fontWeight: 500, color: '#1F2839' }}>
                    {selectedProject.clientContact?.name || '—'}
                  </span>
                  {selectedProject.clientContact?.phone && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280' }}>
                      {selectedProject.clientContact.phone}
                    </span>
                  )}
                </div>

                <div>
                  <span style={{ color: '#6B7280', fontSize: '0.75rem', display: 'block' }}>
                    Site Code / Location
                  </span>
                  <span style={{ fontWeight: 500, color: '#1F2839' }}>
                    {selectedProject.siteCode ? `[${selectedProject.siteCode}] ` : ''}
                    {selectedProject.location}
                  </span>
                </div>
              </div>
            )}

            <div className="form-grid">
              <FormField label="Activity" required style={{ marginBottom: 0 }}>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Rig Mobilization, Site Equipment Supply..."
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </FormField>

              <FormField label="Operational Notes / Remarks" style={{ marginBottom: 0 }}>
                <Input
                  type="text"
                  placeholder="e.g. Special handling, transshipment instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '1.25rem 0' }} />

          {/* Section 2: Selected Items */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1F2839' }}>
                2. Dispatched Inventory Items ({selectedItems.length})
              </h4>

              {establishedWarehouseId && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(34, 80, 161, 0.08)',
                    color: '#2250A1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <WarehouseIcon size={14} />
                  <span>Source Hub: {selectedItems[0]?.warehouseName} [{selectedItems[0]?.cityCode}]</span>
                </div>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  border: '1px dashed #D1D5DB',
                  borderRadius: '6px',
                  color: '#6B7280',
                  fontSize: '0.875rem',
                }}
              >
                No items added yet. Search and select available warehouse inventory below.
              </div>
            ) : (
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>PIC / Remarks</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item) => (
                      <tr key={item.itemId}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1F2839' }}>{item.itemName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                            {item.brand && `Brand: ${item.brand} `}
                            {item.modelNumber && `| MN: ${item.modelNumber}`}
                          </div>
                          {item.trackingType === 'SERIALIZED' && item.selectedSerials && (
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {item.selectedSerials.map((s) => (
                                <span
                                  key={s.id}
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(34, 80, 161, 0.08)',
                                    color: '#2250A1',
                                  }}
                                >
                                  {s.serialNumber}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: item.trackingType === 'BULK' ? '#047857' : '#2250A1',
                            }}
                          >
                            {item.trackingType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                        <td>{item.unitSymbol || item.unit}</td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: '#4B5563' }}>
                            {item.pic ? `PIC: ${item.pic}` : ''}
                            {item.remarks ? ` (${item.remarks})` : ''}
                            {!item.pic && !item.remarks && '—'}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.itemId)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '1.25rem 0' }} />

          {/* Section 3: Available Inventory Search & Selector */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#1F2839' }}>
              3. Available Warehouse Inventory
            </h4>

            <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
              <Input
                type="text"
                placeholder="Search available stock by item name, brand, MN, or SN..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
              />
            </div>

            {/* Inventory Results Table */}
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Item / Brand</th>
                    <th>Warehouse</th>
                    <th>Type</th>
                    <th>Available Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedInventory).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#6B7280' }}>
                        {isSearchingInventory ? 'Searching available inventory...' : 'No available inventory matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedInventory).map(([key, group]) => {
                      const first = group[0];
                      const isWarehouseMismatched =
                        establishedWarehouseId !== null && establishedWarehouseId !== first.warehouseId;
                      const isAlreadySelected = selectedItems.some((i) => i.itemId === first.itemId);

                      return (
                        <tr
                          key={key}
                          style={{
                            opacity: isWarehouseMismatched ? 0.45 : 1,
                            backgroundColor: isAlreadySelected ? '#F0FDF4' : undefined,
                          }}
                        >
                          <td>
                            <div style={{ fontWeight: 600, color: '#1F2839' }}>{first.itemName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              {first.brand && `${first.brand} `}
                              {first.modelNumber && `[${first.modelNumber}]`}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#2250A1' }}>
                              {first.warehouseName} [{first.cityCode}]
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {first.trackingType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {first.trackingType === 'BULK' ? (
                              <span>
                                {first.availableQty} {first.unitSymbol}
                              </span>
                            ) : (
                              <span>{group.length} serial asset(s)</span>
                            )}
                          </td>
                          <td>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isWarehouseMismatched}
                              onClick={() => handleSelectItemForAdd(first)}
                            >
                              {isAlreadySelected ? 'Edit Qty / SN' : '+ Select'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-modal / Drawer for Item Configuration (Qty, SN, PIC, Remarks) */}
          {pickerItem && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>
                  Configure Item: {pickerItem.itemName} ({pickerItem.trackingType})
                </h5>
                <Button variant="ghost" size="sm" onClick={() => setPickerItem(null)}>
                  Cancel
                </Button>
              </div>

              {pickerItem.trackingType === 'BULK' ? (
                <div>
                  <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
                    <FormField label={`Quantity (Max: ${pickerItem.availableQty} ${pickerItem.unitSymbol})`} required style={{ marginBottom: 0 }}>
                      <Input
                        type="number"
                        min="1"
                        max={pickerItem.availableQty}
                        value={bulkQtyInput}
                        onChange={(e) => setBulkQtyInput(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormField>

                    <FormField label="Assigned PIC (Optional)" style={{ marginBottom: 0 }}>
                      <Input
                        type="text"
                        placeholder="e.g. John / Site Tech"
                        value={itemPicInput}
                        onChange={(e) => setItemPicInput(e.target.value)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Item Remarks (Optional)" style={{ marginBottom: '0.75rem' }}>
                    <Input
                      type="text"
                      placeholder="e.g. Batch #4, for generator hookup"
                      value={itemRemarksInput}
                      onChange={(e) => setItemRemarksInput(e.target.value)}
                    />
                  </FormField>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" size="sm" onClick={handleConfirmAddBulk}>
                      Confirm Bulk Item
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {(() => {
                    const groupKey = `${pickerItem.warehouseId}-${pickerItem.itemId}`;
                    const serials = groupedInventory[groupKey] || [pickerItem];

                    return (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#1E40AF', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Select Available Serial Numbers (Checked: {Object.values(selectedSnMap).filter(Boolean).length}):
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '6px',
                            maxHeight: '140px',
                            overflowY: 'auto',
                            padding: '0.5rem',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #DBEAFE',
                            borderRadius: '6px',
                            marginBottom: '0.75rem',
                          }}
                        >
                          {serials.map((s) => {
                            const isChecked = !!selectedSnMap[s.serialNumber || ''];
                            return (
                              <label
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) =>
                                    setSelectedSnMap({
                                      ...selectedSnMap,
                                      [s.serialNumber || '']: e.target.checked,
                                    })
                                  }
                                />
                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                  {s.serialNumber}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                                  ({s.condition})
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
                          <FormField label="Assigned PIC (Optional)" style={{ marginBottom: 0 }}>
                            <Input
                              type="text"
                              placeholder="e.g. Site Engineer"
                              value={itemPicInput}
                              onChange={(e) => setItemPicInput(e.target.value)}
                            />
                          </FormField>

                          <FormField label="Item Remarks (Optional)" style={{ marginBottom: 0 }}>
                            <Input
                              type="text"
                              placeholder="e.g. Primary unit for tower"
                              value={itemRemarksInput}
                              onChange={(e) => setItemRemarksInput(e.target.value)}
                            />
                          </FormField>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmAddSerialized(serials)}
                          >
                            Confirm Serialized Items
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSaving} disabled={isLoading || selectedItems.length === 0}>
            {deliveryOrderId ? 'Save Draft Changes' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

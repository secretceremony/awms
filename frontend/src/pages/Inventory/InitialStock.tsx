import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PageHeader, FormField, Select, Input, Button } from '../../components/ui/index.js';

export const InitialStock = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<{id: number, name: string, trackingType: string}[]>([]);
  const [warehouses, setWarehouses] = useState<{id: number, name: string}[]>([]);
  const [formData, setFormData] = useState({
    itemId: '',
    warehouseId: '',
    quantity: 1,
    serialNumber: '',
    conditionLabel: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, whRes] = await Promise.all<any>([
          apiClient.get('/items'),
          apiClient.get('/warehouses')
        ]);
        setItems(itemsRes.data.data || []);
        setWarehouses(whRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const selectedItem = items.find(i => i.id.toString() === formData.itemId);
  const isSerialized = selectedItem?.trackingType === 'SERIALIZED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        movementType: 'INITIAL',
        destinationWarehouseId: parseInt(formData.warehouseId),
        items: [{
          itemId: parseInt(formData.itemId),
          quantity: isSerialized ? 1 : formData.quantity,
          serialDetails: isSerialized ? [{
            serialNumber: formData.serialNumber,
            conditionLabel: formData.conditionLabel || undefined
          }] : undefined
        }]
      };
      await apiClient.post('/stock-movements', payload);
      alert('Initial stock added successfully');
      navigate('/inventory');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error adding initial stock');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Add Initial Stock" />
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px'}}>
        <FormField label="Item">
          <Select 
            value={formData.itemId} 
            onChange={e => setFormData({...formData, itemId: e.target.value})} 
            required
            options={[
              { value: '', label: 'Select Item' },
              ...items.map(i => ({ value: i.id.toString(), label: i.name }))
            ]}
          />
        </FormField>
        
        <FormField label="Destination Warehouse">
          <Select 
            value={formData.warehouseId} 
            onChange={e => setFormData({...formData, warehouseId: e.target.value})} 
            required
            options={[
              { value: '', label: 'Select Warehouse' },
              ...warehouses.map(w => ({ value: w.id.toString(), label: w.name }))
            ]}
          />
        </FormField>
        
        {!isSerialized && (
          <FormField label="Quantity">
            <Input 
              type="number" 
              min="1" 
              value={formData.quantity} 
              onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} 
              required 
            />
          </FormField>
        )}

        {isSerialized && (
          <>
            <FormField label="Serial Number">
              <Input 
                value={formData.serialNumber} 
                onChange={e => setFormData({...formData, serialNumber: e.target.value})} 
                required 
              />
            </FormField>
            <FormField label="Condition Label (Optional)">
              <Input 
                value={formData.conditionLabel} 
                onChange={e => setFormData({...formData, conditionLabel: e.target.value})} 
              />
            </FormField>
          </>
        )}

        <Button type="submit" variant="primary" disabled={!formData.itemId || !formData.warehouseId}>
          Submit
        </Button>
      </form>
    </div>
  );
};

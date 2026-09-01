import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PageHeader, FormField, Input, Select, Textarea, Button, Card } from '../../components/ui/index.js';

export const AddIncomingForm = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<{id: number, name: string, trackingType: string}[]>([]);
  const [warehouses, setWarehouses] = useState<{id: number, name: string}[]>([]);
  const [formData, setFormData] = useState({
    referenceNumber: '',
    destinationWarehouseId: '',
    notes: ''
  });
  
  const [movementItems, setMovementItems] = useState([{
    itemId: '',
    quantity: 1,
    serialNumber: '',
    conditionLabel: ''
  }]);

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

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...movementItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setMovementItems(newItems);
  };

  const addItemRow = () => {
    setMovementItems([...movementItems, { itemId: '', quantity: 1, serialNumber: '', conditionLabel: '' }]);
  };
  
  const removeItemRow = (index: number) => {
    setMovementItems(movementItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        movementType: 'INCOMING',
        referenceNumber: formData.referenceNumber,
        destinationWarehouseId: parseInt(formData.destinationWarehouseId),
        items: movementItems.map(item => {
          const selectedItem = items.find(i => i.id.toString() === item.itemId);
          const isSerialized = selectedItem?.trackingType === 'SERIALIZED';
          return {
            itemId: parseInt(item.itemId),
            quantity: isSerialized ? 1 : Number(item.quantity),
            serialDetails: isSerialized ? [{
              serialNumber: item.serialNumber,
              conditionLabel: item.conditionLabel || undefined
            }] : undefined
          };
        })
      };
      
      await apiClient.post('/stock-movements/incoming', payload);
      navigate('/inventory/incoming');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error adding incoming movement');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Add Incoming Stock" />
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px'}}>
        
        <Card>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <FormField label="Reference No">
              <Input 
                value={formData.referenceNumber} 
                onChange={e => setFormData({...formData, referenceNumber: e.target.value})} 
              />
            </FormField>
            
            <FormField label="Destination Warehouse">
              <Select 
                value={formData.destinationWarehouseId} 
                onChange={e => setFormData({...formData, destinationWarehouseId: e.target.value})} 
                required
                options={[
                  { value: '', label: 'Select Warehouse' },
                  ...warehouses.map(w => ({ value: w.id.toString(), label: w.name }))
                ]}
              />
            </FormField>
            
            <FormField label="Notes">
              <Textarea 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                rows={3}
              />
            </FormField>
          </div>
        </Card>
        
        <Card>
          <h4>Items</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {movementItems.map((item, index) => {
              const selectedItem = items.find(i => i.id.toString() === item.itemId);
              const isSerialized = selectedItem?.trackingType === 'SERIALIZED';
              return (
                <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <FormField label="Item">
                      <Select 
                        value={item.itemId} 
                        onChange={e => handleItemChange(index, 'itemId', e.target.value)} 
                        required
                        options={[
                          { value: '', label: 'Select Item' },
                          ...items.map(i => ({ value: i.id.toString(), label: i.name }))
                        ]}
                      />
                    </FormField>
                    
                    {!isSerialized && (
                      <FormField label="Quantity">
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                          required 
                        />
                      </FormField>
                    )}

                    {isSerialized && (
                      <>
                        <FormField label="Serial Number">
                          <Input 
                            value={item.serialNumber} 
                            onChange={e => handleItemChange(index, 'serialNumber', e.target.value)} 
                            required 
                          />
                        </FormField>
                        <FormField label="Condition Label (Optional)">
                          <Input 
                            value={item.conditionLabel} 
                            onChange={e => handleItemChange(index, 'conditionLabel', e.target.value)} 
                          />
                        </FormField>
                      </>
                    )}
                  </div>
                  {movementItems.length > 1 && (
                    <div style={{ paddingTop: '1.75rem' }}>
                      <Button type="button" onClick={() => removeItemRow(index)} variant="danger">
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <div>
              <Button type="button" onClick={addItemRow} variant="secondary">Add Item</Button>
            </div>
          </div>
        </Card>

        <div>
          <Button type="submit" variant="primary" disabled={!formData.destinationWarehouseId || movementItems.some(i => !i.itemId)}>
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
};

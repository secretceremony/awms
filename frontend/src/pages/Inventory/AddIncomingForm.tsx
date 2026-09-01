import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.js';

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
      <h2>Add Incoming Stock</h2>
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px'}}>
        
        <label>
          Reference No:
          <input 
            value={formData.referenceNumber} 
            onChange={e => setFormData({...formData, referenceNumber: e.target.value})} 
          />
        </label>
        
        <label>
          Destination Warehouse:
          <select value={formData.destinationWarehouseId} onChange={e => setFormData({...formData, destinationWarehouseId: e.target.value})} required>
            <option value="">Select Warehouse</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        
        <label>
          Notes:
          <textarea 
            value={formData.notes} 
            onChange={e => setFormData({...formData, notes: e.target.value})} 
            rows={3}
          />
        </label>
        
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h4>Items</h4>
          {movementItems.map((item, index) => {
            const selectedItem = items.find(i => i.id.toString() === item.itemId);
            const isSerialized = selectedItem?.trackingType === 'SERIALIZED';
            return (
              <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label>
                    Item:
                    <select value={item.itemId} onChange={e => handleItemChange(index, 'itemId', e.target.value)} required>
                      <option value="">Select Item</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </label>
                  
                  {!isSerialized && (
                    <label>
                      Quantity:
                      <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} required />
                    </label>
                  )}

                  {isSerialized && (
                    <>
                      <label>
                        Serial Number:
                        <input value={item.serialNumber} onChange={e => handleItemChange(index, 'serialNumber', e.target.value)} required />
                      </label>
                      <label>
                        Condition Label (Optional):
                        <input value={item.conditionLabel} onChange={e => handleItemChange(index, 'conditionLabel', e.target.value)} />
                      </label>
                    </>
                  )}
                </div>
                {movementItems.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(index)} className="btn-secondary btn-sm" style={{ marginTop: '1.5rem' }}>
                    Remove
                  </button>
                )}
              </div>
            );
          })}
          <button type="button" onClick={addItemRow} className="btn-secondary btn-sm">Add Item</button>
        </div>

        <button type="submit" className="btn-primary" disabled={!formData.destinationWarehouseId || movementItems.some(i => !i.itemId)}>Submit</button>
      </form>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { Button, Input, Select, FormField, PageHeader, Card } from '../../components/ui/index.js';

export const ItemForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    unitId: '',
    trackingType: 'BULK',
    isActive: true
  });
  const [units, setUnits] = useState<{id: number, name: string}[]>([]);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const { data } = await apiClient.get<any>('/units');
        setUnits(data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnits();

    if (id) {
      const fetchItem = async () => {
        try {
          const { data } = await apiClient.get<any>(`/items/${id}`);
          setFormData({
            name: data.name,
            brand: data.brand || '',
            unitId: data.unitId.toString(),
            trackingType: data.trackingType,
            isActive: data.isActive
          });
        } catch (err) {
          console.error(err);
        }
      };
      fetchItem();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      unitId: parseInt(formData.unitId),
    };
    try {
      if (id) {
        await apiClient.patch(`/items/${id}`, payload);
      } else {
        await apiClient.post('/items', payload);
      }
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      alert('Error saving item');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title={id ? "Edit Item" : "Create Item"} />
      <Card>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <FormField label="Name" required>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </FormField>
          
          <FormField label="Brand">
            <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
          </FormField>
          
          <FormField label="Unit" required>
            <Select value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})} required>
              <option value="">Select Unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          
          <FormField label="Tracking Type">
            <Select value={formData.trackingType} onChange={e => setFormData({...formData, trackingType: e.target.value})} disabled={!!id}>
              <option value="BULK">Bulk</option>
              <option value="SERIALIZED">Serialized</option>
            </Select>
          </FormField>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button type="submit" variant="primary">Save</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

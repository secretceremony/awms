import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PaginatedTable } from '../../components/PaginatedTable.js';
import { PageHeader, Button, Card, StatusBadge } from '../../components/ui/index.js';

interface Item {
  id: number;
  name: string;
  brand: string;
  trackingType: string;
  unit: { name: string };
  isActive: boolean;
}

export const ItemDetail = () => {
  const { id } = useParams();
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data } = await apiClient.get<any>(`/items/${id}`);
        setItem(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchItem();
  }, [id]);

  if (!item) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container">
      <PageHeader 
        title={`Item Details: ${item.name}`}
        actions={
          <Link to={`/inventory/edit/${id}`}>
            <Button variant="primary">Edit</Button>
          </Link>
        }
      />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p><strong>Brand:</strong> {item.brand}</p>
          <p><strong>Tracking:</strong> {item.trackingType}</p>
          <p><strong>Unit:</strong> {item.unit?.name}</p>
          <p>
            <strong>Status:</strong>{' '}
            <StatusBadge 
              status={item.isActive ? 'active' : 'inactive'} 
              label={item.isActive ? 'Active' : 'Inactive'} 
            />
          </p>
        </div>
      </Card>

      {item.trackingType === 'SERIALIZED' && (
        <div style={{marginTop: '2rem'}}>
          <h3>Serials</h3>
          <PaginatedTable<any>
            fetchUrl={`/items/${id}/serials`}
            columns={[
              { header: 'Serial Number', key: 'serialNumber' },
              { header: 'State', key: 'state' },
              { header: 'Condition', key: 'conditionLabel' },
              { header: 'Warehouse', key: 'currentWarehouse', render: row => row.currentWarehouse?.name || '-' },
              { header: 'Project', key: 'currentProject', render: row => row.currentProject?.name || '-' }
            ]}
          />
        </div>
      )}
    </div>
  );
};

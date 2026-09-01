import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { PaginatedTable } from '../../components/PaginatedTable.js';

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

  if (!item) return <div>Loading...</div>;

  return (
    <div className="page-container">
      <h2>Item Details: {item.name}</h2>
      <div>
        <p>Brand: {item.brand}</p>
        <p>Tracking: {item.trackingType}</p>
        <p>Unit: {item.unit?.name}</p>
        <p>Status: {item.isActive ? 'Active' : 'Inactive'}</p>
      </div>
      <div style={{marginTop: '1rem'}}>
        <Link to={`/inventory/edit/${id}`}><button>Edit</button></Link>
      </div>

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

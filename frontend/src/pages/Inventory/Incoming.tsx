import { useNavigate } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';

interface StockMovement {
  id: number;
  movementNumber: string;
  referenceNumber: string;
  createdAt: string;
  destinationWarehouse?: {
    name: string;
  };
  createdBy?: {
    name: string;
  };
}

export const Incoming = () => {
  const navigate = useNavigate();
  const columns: Column<StockMovement>[] = [
    { header: 'Movement No.', key: 'movementNumber' },
    { header: 'Reference Code', key: 'referenceNumber' },
    { 
      header: 'Destination Wh', 
      key: 'destinationWarehouse',
      render: (item) => item.destinationWarehouse?.name || '-'
    },
    { 
      header: 'Created By', 
      key: 'createdBy',
      render: (item) => item.createdBy?.name || '-'
    },
    { 
      header: 'Date', 
      key: 'createdAt',
      render: (item) => new Date(item.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      key: 'id',
      render: (item) => (
        <button onClick={() => navigate(`/inventory/incoming/${item.id}`)} className="btn-secondary btn-sm">
          View Detail
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Incoming Stock</h2>
        <button className="btn-primary" onClick={() => navigate('/inventory/incoming/new')}>
          Add Incoming
        </button>
      </div>
      <PaginatedTable<StockMovement>
        columns={columns}
        fetchUrl="/stock-movements/incoming"
        searchPlaceholder="Search incoming movements..."
      />
    </div>
  );
};

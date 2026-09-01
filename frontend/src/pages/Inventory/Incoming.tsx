import { useNavigate } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { PageHeader, Button } from '../../components/ui/index.js';

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
        <Button variant="secondary" onClick={() => navigate(`/inventory/incoming/${item.id}`)}>
          View Detail
        </Button>
      )
    }
  ];

  return (
    <div className="page-container">
      <PageHeader 
        title="Incoming Stock" 
        actions={
          <Button variant="primary" onClick={() => navigate('/inventory/incoming/new')}>
            Add Incoming
          </Button>
        }
      />
      <PaginatedTable<StockMovement>
        columns={columns}
        fetchUrl="/stock-movements/incoming"
        searchPlaceholder="Search incoming movements..."
      />
    </div>
  );
};

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
  ];

  return (
    <div className="page-container">
      <PaginatedTable<StockMovement>
        columns={columns}
        fetchUrl="/stock-movements"
        extraParams={{ type: 'INCOMING' }}
        searchPlaceholder="Search incoming movements..."
      />
    </div>
  );
};

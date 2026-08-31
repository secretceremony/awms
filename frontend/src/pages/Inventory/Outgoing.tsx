import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';

interface StockMovement {
  id: number;
  movementNumber: string;
  referenceNumber: string;
  createdAt: string;
  sourceWarehouse?: {
    name: string;
  };
  createdBy?: {
    name: string;
  };
}

export const Outgoing = () => {
  const columns: Column<StockMovement>[] = [
    { header: 'Movement No.', key: 'movementNumber' },
    { header: 'Reference Code', key: 'referenceNumber' },
    { 
      header: 'Source Wh', 
      key: 'sourceWarehouse',
      render: (item) => item.sourceWarehouse?.name || '-'
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
        extraParams={{ type: 'OUTGOING' }}
        searchPlaceholder="Search outgoing movements..."
      />
    </div>
  );
};

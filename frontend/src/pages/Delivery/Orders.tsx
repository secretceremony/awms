import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';

interface DeliveryOrder {
  id: number;
  doNumber: string;
  doDate: string;
  status: string;
  customer?: {
    name: string;
  };
}

export const Orders = () => {
  const columns: Column<DeliveryOrder>[] = [
    { header: 'DO Number', key: 'doNumber' },
    { 
      header: 'DO Date', 
      key: 'doDate',
      render: (item) => new Date(item.doDate).toLocaleDateString()
    },
    { 
      header: 'Customer', 
      key: 'customer',
      render: (item) => item.customer?.name || '-'
    },
    { 
      header: 'Status', 
      key: 'status',
      render: (item) => (
        <span className={`badge-status do-${item.status?.toLowerCase()}`}>
          {item.status}
        </span>
      )
    },
  ];

  return (
    <div className="page-container">
      <PaginatedTable<DeliveryOrder>
        columns={columns}
        fetchUrl="/delivery-orders"
        searchPlaceholder="Search delivery orders by DO Number..."
      />
    </div>
  );
};

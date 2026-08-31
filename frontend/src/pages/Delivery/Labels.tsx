import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';

interface ShippingLabel {
  id: number;
  labelCode: string;
  carrier: string;
  trackingNumber: string;
  createdAt: string;
}

export const Labels = () => {
  const columns: Column<ShippingLabel>[] = [
    { header: 'Label Code', key: 'labelCode' },
    { header: 'Carrier', key: 'carrier' },
    { header: 'Tracking Number', key: 'trackingNumber' },
    { 
      header: 'Generated Date', 
      key: 'createdAt',
      render: (item) => new Date(item.createdAt).toLocaleDateString()
    },
  ];

  return (
    <div className="page-container">
      <PaginatedTable<ShippingLabel>
        columns={columns}
        fetchUrl="/shipping-labels"
        searchPlaceholder="Search shipping labels by code or tracking number..."
      />
    </div>
  );
};

import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';

interface Item {
  id: number;
  sku: string;
  name: string;
  trackingType: string;
  unit?: {
    name: string;
  };
}

export const StockList = () => {
  const columns: Column<Item>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Name', key: 'name' },
    { 
      header: 'Unit', 
      key: 'unit',
      render: (item) => item.unit?.name || '-'
    },
    { 
      header: 'Tracking Type', 
      key: 'trackingType',
      render: (item) => (
        <span className={`badge-tracking type-${item.trackingType?.toLowerCase()}`}>
          {item.trackingType}
        </span>
      )
    },
  ];

  return (
    <div className="page-container">
      <PaginatedTable<Item>
        columns={columns}
        fetchUrl="/items"
        searchPlaceholder="Search items by SKU or Name..."
      />
    </div>
  );
};

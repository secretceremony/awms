import { Link } from 'react-router-dom';
import { Button, PageHeader, StatusBadge } from '../../components/ui/index.js';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';

interface Item {
  id: number;
  brand: string;
  name: string;
  trackingType: string;
  unit?: {
    name: string;
  };
}

export const StockList = () => {
  const columns: Column<Item>[] = [
    { header: 'Brand', key: 'brand' },
    { 
      header: 'Name', 
      key: 'name',
      render: (item) => <Link to={`/inventory/item/${item.id}`}>{item.name}</Link>
    },
    { 
      header: 'Unit', 
      key: 'unit',
      render: (item) => item.unit?.name || '-'
    },
    { 
      header: 'Tracking Type', 
      key: 'trackingType',
      render: (item) => (
        <StatusBadge status={item.trackingType} />
      )
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Items"
        actions={
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/inventory/new"><Button variant="primary">Add Item</Button></Link>
            <Link to="/inventory/initial-stock"><Button variant="secondary">Add Initial Stock</Button></Link>
          </div>
        }
      />
      <PaginatedTable<Item>
        columns={columns}
        fetchUrl="/items"
        searchPlaceholder="Search items by Brand or Name..."
      />
    </div>
  );
};

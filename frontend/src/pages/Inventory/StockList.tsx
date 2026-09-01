import { Link } from 'react-router-dom';
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
        <span className={`badge-tracking type-${item.trackingType?.toLowerCase()}`}>
          {item.trackingType}
        </span>
      )
    },
  ];

  return (
    <div className="page-container">
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
        <h2>Inventory Items</h2>
        <div>
          <Link to="/inventory/new"><button style={{marginRight: '1rem'}}>Add Item</button></Link>
          <Link to="/inventory/initial-stock"><button>Add Initial Stock</button></Link>
        </div>
      </div>
      <PaginatedTable<Item>
        columns={columns}
        fetchUrl="/items"
        searchPlaceholder="Search items by Brand or Name..."
      />
    </div>
  );
};

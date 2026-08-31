import { PaginatedTable, type Column } from '../components/PaginatedTable.js';

interface Warehouse {
  id: number;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
}

export const Warehouses = () => {
  const columns: Column<Warehouse>[] = [
    { header: 'Code', key: 'code' },
    { header: 'Name', key: 'name' },
    { header: 'Address', key: 'address' },
    { 
      header: 'Status', 
      key: 'isActive',
      render: (item) => (
        <span className={`badge-status ${item.isActive ? 'active' : 'inactive'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
  ];

  return (
    <div className="page-container">
      <PaginatedTable<Warehouse>
        columns={columns}
        fetchUrl="/warehouses"
        searchPlaceholder="Search warehouses by name or code..."
      />
    </div>
  );
};

import { PaginatedTable, type Column } from '../components/PaginatedTable.js';

interface Customer {
  id: number;
  code: string;
  name: string;
  contactName: string;
  email: string;
  isActive: boolean;
}

export const Customers = () => {
  const columns: Column<Customer>[] = [
    { header: 'Code', key: 'code' },
    { header: 'Name', key: 'name' },
    { header: 'Contact Person', key: 'contactName' },
    { header: 'Email', key: 'email' },
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
      <PaginatedTable<Customer>
        columns={columns}
        fetchUrl="/customers"
        searchPlaceholder="Search customers by name or code..."
      />
    </div>
  );
};

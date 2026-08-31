import { PaginatedTable, type Column } from '../components/PaginatedTable.js';

interface AuditLog {
  id: number;
  action: string;
  tableName: string;
  rowId: number;
  createdAt: string;
  user?: {
    name: string;
  };
}

export const Logs = () => {
  const columns: Column<AuditLog>[] = [
    { header: 'Action', key: 'action' },
    { header: 'Module/Table', key: 'tableName' },
    { header: 'Reference ID', key: 'rowId' },
    { 
      header: 'User', 
      key: 'user',
      render: (item) => item.user?.name || '-'
    },
    { 
      header: 'Timestamp', 
      key: 'createdAt',
      render: (item) => new Date(item.createdAt).toLocaleString()
    },
  ];

  return (
    <div className="page-container">
      <PaginatedTable<AuditLog>
        columns={columns}
        fetchUrl="/audit-logs"
        searchPlaceholder="Search audit logs by action or table..."
      />
    </div>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginatedTable, type Column } from '../../components/PaginatedTable.js';
import { Eye, Plus } from 'lucide-react';
import { Button, PageHeader } from '../../components/ui/index.js';
import { AddIncomingModal } from '../../components/inventory/AddIncomingModal.js';

interface StockMovement {
  id: number;
  movementNumber: string;
  movementType: string;
  referenceNumber: string | null;
  createdAt: string;
  destinationWarehouse?: { name: string };
  createdBy?: { name: string };
  items: {
    quantity: number;
    item: { name: string; trackingType: string };
    movementSerials?: { itemSerial: { serialNumber: string } }[];
  }[];
}

export const Incoming = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const columns: Column<StockMovement>[] = [
    {
      header: 'Date',
      key: 'createdAt',
      render: (m) => new Date(m.createdAt).toLocaleDateString(),
    },
    {
      header: 'Movement No.',
      key: 'movementNumber',
      render: (m) => <code>{m.movementNumber}</code>,
    },
    {
      header: 'Destination Warehouse',
      key: 'destinationWarehouse',
      render: (m) => m.destinationWarehouse?.name || '-',
    },
    {
      header: 'Item / Quantity',
      key: 'items',
      render: (m) => {
        const first = m.items[0];
        if (!first) return '-';
        return `${first.item.name} (${first.quantity} ${first.item.trackingType})`;
      },
    },
    {
      header: 'Reference',
      key: 'referenceNumber',
      render: (m) => m.referenceNumber || '-',
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (m) => m.createdBy?.name || '-',
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (m) => (
        <button
          className="btn-icon"
          onClick={() => navigate(`/inventory/incoming/${m.id}`)}
          title="View Movement Detail"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Incoming Stock"
        description="History and records of incoming inventory received into warehouses."
        actions={
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} /> Add Incoming
          </Button>
        }
      />

      <PaginatedTable<StockMovement>
        key={`incoming-${refreshKey}`}
        fetchUrl="/stock-movements/incoming"
        searchPlaceholder="Search by reference or item name..."
        columns={columns}
      />

      {/* Add Incoming Modal */}
      <AddIncomingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default Incoming;

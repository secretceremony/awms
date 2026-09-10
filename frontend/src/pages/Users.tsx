import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Select,
  StatusBadge,
  ConfirmModal,
} from '../components/ui/index.js';
import { PaginatedTable, type Column } from '../components/PaginatedTable.js';
import { UserFormModal, type ManagedUser } from '../components/user/UserFormModal.js';
import { FilterBar, type ActiveFilter } from '../components/filters/index.js';
import { apiClient } from '../api/client.js';
import { Plus, Edit2, Ban, CheckCircle, Shield, UserCheck, ShieldAlert, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { canManageUsers } from '../utils/permissions.js';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Confirm modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    if (!('page' in updates)) {
      nextParams.delete('page');
    }
    setSearchParams(nextParams);
  };

  const handleResetAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const { showToast } = useToast();

  const handleCreate = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (u: ManagedUser) => {
    setSelectedUser(u);
    setIsFormModalOpen(true);
  };

  const handleDeactivate = (u: ManagedUser) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate user "${u.name}" (${u.email})? They will no longer be able to log in to AWMS.`,
      confirmText: 'Deactivate',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.patch(`/users/${u.id}`, { isActive: false });
          showToast({ type: 'success', message: `User "${u.name}" deactivated` });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          const msg = err.message || 'Failed to deactivate user';
          setActionError(msg);
          showToast({ type: 'error', message: msg });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleReactivate = (u: ManagedUser) => {
    setActionError(null);
    setConfirmConfig({
      isOpen: true,
      title: 'Reactivate User',
      message: `Reactivate user "${u.name}" (${u.email}) to allow login access to AWMS?`,
      confirmText: 'Reactivate',
      variant: 'primary',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await apiClient.patch(`/users/${u.id}`, { isActive: true });
          showToast({ type: 'success', message: `User "${u.name}" reactivated` });
          setRefreshTrigger((prev) => prev + 1);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          const msg = err.message || 'Failed to reactivate user';
          setActionError(msg);
          showToast({ type: 'error', message: msg });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const activeFilters: ActiveFilter[] = [];
  if (roleFilter !== 'all') {
    activeFilters.push({
      key: 'role',
      label: 'Role',
      valueDisplay: roleFilter,
      onClear: () => updateFilters({ role: null }),
    });
  }
  if (statusFilter !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      valueDisplay: statusFilter === 'active' ? 'Active' : 'Inactive',
      onClear: () => updateFilters({ status: null }),
    });
  }

  const getRoleBadge = (role: string) => {
    let bgColor = 'rgba(107, 114, 128, 0.1)';
    let color = '#4B5563';
    let borderColor = '#D1D5DB';
    let icon = <Eye size={12} />;

    if (role === 'SUPER_ADMIN') {
      bgColor = 'rgba(126, 34, 206, 0.1)';
      color = '#7E22CE';
      borderColor = 'rgba(126, 34, 206, 0.3)';
      icon = <ShieldAlert size={12} />;
    } else if (role === 'ADMIN' || role === 'ADMIN_LOGISTICS') {
      bgColor = 'rgba(34, 80, 161, 0.1)';
      color = '#2250A1';
      borderColor = 'rgba(34, 80, 161, 0.25)';
      icon = <Shield size={12} />;
    } else if (role === 'READ_ONLY' || role === 'USER') {
      bgColor = 'rgba(16, 185, 129, 0.1)';
      color = '#059669';
      borderColor = 'rgba(16, 185, 129, 0.25)';
      icon = <UserCheck size={12} />;
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: bgColor,
          color,
          border: `1px solid ${borderColor}`,
        }}
      >
        {icon}
        {role}
      </span>
    );
  };

  const columns: Column<ManagedUser>[] = [
    {
      key: 'name',
      header: 'User Name',
      render: (u: ManagedUser) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#1F2839' }}>{u.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>ID: #{u.id}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email Address',
      render: (u: ManagedUser) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1F2839' }}>
          {u.email}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: ManagedUser) => getRoleBadge(u.role),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (u: ManagedUser) => (
        <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: ManagedUser) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {canManageUsers(currentUser?.role) ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(u)}
                title="Edit User Information or Role"
              >
                <Edit2 size={14} />
              </Button>

              {u.isActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeactivate(u)}
                  title="Deactivate User"
                  style={{ color: '#EF4444' }}
                  disabled={u.id === currentUser?.id}
                >
                  <Ban size={14} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReactivate(u)}
                  title="Reactivate User"
                  style={{ color: '#10B981' }}
                >
                  <CheckCircle size={14} />
                </Button>
              )}
            </>
          ) : (
            <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="User Management"
        description="System access directory, role assignments, and authentication status for AWMS operators"
        actions={
          canManageUsers(currentUser?.role) ? (
            <Button variant="primary" onClick={handleCreate}>
              <Plus size={16} /> Add User
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
          {actionError}
        </div>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => updateFilters({ search: val })}
        searchPlaceholder="Search by user name or email..."
        primaryFilter={
          <div style={{ width: '160px' }}>
            <Select
              value={roleFilter}
              onChange={(e) => updateFilters({ role: e.target.value })}
            >
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="READ_ONLY">READ_ONLY</option>
            </Select>
          </div>
        }
        hasAdvancedFilters
        isAdvancedOpen={false}
        activeFilters={activeFilters}
        onResetAll={handleResetAll}
      />

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ width: '160px' }}>
          <Select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </Select>
        </div>
      </div>

      <PaginatedTable<ManagedUser>
        fetchUrl="/users"
        searchPlaceholder="Search user name or email..."
        columns={columns}
        extraParams={{
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }}
        key={refreshTrigger}
      />

      {isFormModalOpen && (
        <UserFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          user={selectedUser}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={isProcessing}
      />
    </div>
  );
};

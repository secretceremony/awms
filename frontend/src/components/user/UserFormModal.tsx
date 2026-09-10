import React, { useState, useEffect, useRef } from 'react';
import { Modal, FormField, Input, Select, Button, ConfirmModal } from '../ui/index.js';
import { apiClient } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import type { UserRole } from '../../utils/permissions.js';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: ManagedUser | null;
  onSuccess: () => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN' as UserRole,
  });
  const [initialData, setInitialData] = useState(formData);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        const init = {
          name: user.name,
          email: user.email,
          password: '',
          role: user.role,
        };
        setFormData(init);
        setInitialData(init);
      } else {
        const init = {
          name: '',
          email: '',
          password: '',
          role: 'ADMIN' as UserRole,
        };
        setFormData(init);
        setInitialData(init);
      }
      setErrorMsg(null);

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, user]);

  const hasUnsavedChanges = () => {
    return (
      formData.name !== initialData.name ||
      formData.email !== initialData.email ||
      formData.password !== initialData.password ||
      formData.role !== initialData.role
    );
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password.trim();
    const role = formData.role;

    if (!name) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!email) {
      setErrorMsg('Email Address is required');
      return;
    }

    if (!user && !password) {
      setErrorMsg('Initial password is required for new users');
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setIsSaving(true);
    try {
      if (user) {
        // Update user
        const payload: any = {
          name,
          email,
          role,
        };
        if (password) {
          payload.password = password;
        }
        await apiClient.patch(`/users/${user.id}`, payload);
        showToast({ type: 'success', message: `User "${name}" updated successfully` });
      } else {
        // Create user
        await apiClient.post('/users', {
          name,
          email,
          password,
          role,
        });
        showToast({ type: 'success', message: `User "${name}" created successfully` });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to save user';
      setErrorMsg(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={user ? `Edit User: ${user.name}` : 'Create New User'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-error">
                {errorMsg}
              </div>
            )}

            <FormField label="Full Name" required>
              <Input
                ref={nameInputRef}
                type="text"
                placeholder="e.g. Budi Santoso"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                placeholder="e.g. user@alssa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </FormField>

            <FormField
              label={user ? 'New Password (leave blank to keep current)' : 'Password'}
              required={!user}
              helperText={user ? "Only fill if you want to reset this user's password" : 'At least 6 characters'}
            >
              <Input
                type="password"
                placeholder={user ? '••••••••' : 'Enter initial password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!user}
              />
            </FormField>

            <FormField label="System Role" required helperText="Controls permissions and access across AWMS">
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value="SUPER_ADMIN">SUPER_ADMIN (Full system, user & settings management)</option>
                <option value="ADMIN">ADMIN (Operational warehouse data management)</option>
                <option value="READ_ONLY">READ_ONLY (View-only operational browsing)</option>
              </Select>
            </FormField>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={handleRequestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {user ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this user form. Closing will discard them."
        confirmText="Discard Changes"
        variant="danger"
      />
    </>
  );
};

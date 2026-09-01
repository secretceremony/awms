import re

with open('frontend/src/pages/Units.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace(
    "import { Edit2, PowerOff } from 'lucide-react';",
    "import { Edit2, PowerOff } from 'lucide-react';\nimport { Button, Input, FormField, Modal, StatusBadge, PageHeader, Card } from '../components/ui/index.js';"
)

# Status Badge in columns
content = re.sub(
    r'<span className={`badge-status \$\{item\.isActive \? \'active\' : \'inactive\'\}`}>\s*\{item\.isActive \? \'Active\' : \'Inactive\'\}\s*</span>',
    r'<StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />',
    content
)

# Action Buttons
content = re.sub(
    r'<button\s*onClick=\{\(\) => openModal\(item\)\}\s*className="btn-edit-action"\s*title="Edit Unit"[^>]*>\s*<Edit2 size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => openModal(item)} title="Edit Unit"><Edit2 size={16} /></Button>',
    content
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleDeactivate\(item\)\}\s*className="btn-deactivate-action"\s*title="Deactivate Unit"[^>]*>\s*<PowerOff size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleDeactivate(item)} title="Deactivate Unit" style={{ color: "#EF4444" }}><PowerOff size={16} /></Button>',
    content
)

# PageHeader
page_header = r'''<PageHeader
        title="Units"
        description="Manage units of measurement (UoM) for inventory items."
        actions={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#1F2839',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <Button variant="primary" onClick={() => openModal()}>
              Add Unit
            </Button>
          </>
        }
      />'''

content = re.sub(
    r'<div style=\{\{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: \'24px\' \}\}>.*?</div>\s*</div>',
    page_header,
    content,
    flags=re.DOTALL
)

# Modal
modal_code = r'''<Modal isOpen={isModalOpen} onClose={closeModal} title={editingUnit ? 'Edit Unit' : 'Add Unit'} width="400px">
        {errorMsg && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>
          
          <FormField label="Symbol">
            <Input
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            />
          </FormField>
          
          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </FormField>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>'''

content = re.sub(r'\{/\* Add / Edit Modal \*/\}.*', '{/* Add / Edit Modal */}\n      ' + modal_code + '\n    </div>\n  );\n};\n', content, flags=re.DOTALL)

with open('frontend/src/pages/Units.tsx', 'w') as f:
    f.write(content)

import re

with open('frontend/src/pages/Customers.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace(
    "import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';",
    "import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';\nimport { Button, Input, Textarea, FormField, Modal, StatusBadge, PageHeader, Card } from '../components/ui/index.js';"
)

# Replace inline statuses
content = re.sub(
    r'<span className={`badge-status \$\{.*?\.isActive \? \'active\' : \'inactive\'\}`}>\s*\{.*?\.isActive \? \'Active\' : \'Inactive\'\}\s*</span>',
    r'<StatusBadge status={item?.isActive ?? viewingCustomer?.isActive ?? false} />',
    content
)
# Fix the item status specifically in the table
content = content.replace(
    "<StatusBadge status={item?.isActive ?? viewingCustomer?.isActive ?? false} />",
    "<StatusBadge status={item ? item.isActive : (viewingCustomer ? viewingCustomer.isActive : false)} />"
)
# It's better to just manually replace the table one and the view one.
content = content.replace(
    """<span className={`badge-status ${item.isActive ? 'active' : 'inactive'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>""",
    """<StatusBadge status={item.isActive} />"""
)
content = content.replace(
    """<span className={`badge-status ${viewingCustomer.isActive ? 'active' : 'inactive'}`}>
                {viewingCustomer.isActive ? 'Active' : 'Inactive'}
              </span>""",
    """<StatusBadge status={viewingCustomer.isActive} />"""
)

# Detail Header
detail_header = r'''<PageHeader
          title={viewingCustomer.name}
          description="Customer detailed profile registration."
          actions={
            <Button variant="ghost" onClick={() => setViewingCustomer(null)}>
              <ArrowLeft size={16} /> Back
            </Button>
          }
        />'''

content = re.sub(
    r'\{/\* Detail Header \*/\}.*?</div>\s*</div>\s*</div>',
    '{/* Detail Header */}\n        ' + detail_header,
    content,
    flags=re.DOTALL
)

# Profile Card
content = re.sub(
    r'<div className="content-card" style=\{\{ padding: \'24px\' \}\}>',
    r'<Card>',
    content
)
content = content.replace('</div>\n      </div>\n    );\n  }', '</Card>\n      </div>\n    );\n  }')

# PageHeader
page_header = r'''<PageHeader
        title="Customers"
        description="Manage client profiles, partner codes, contacts, and delivery locations."
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
              Add Customer
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

# Table Card
content = content.replace('<div className="content-card" style={{ padding: 0 }}>', '<Card style={{ padding: 0 }}>')
content = content.replace('/>\n      </div>\n\n      {/* Add / Edit Modal */}', '/>\n      </Card>\n\n      {/* Add / Edit Modal */}')

# Action Buttons
content = re.sub(
    r'<button\s*onClick=\{\(\) => setViewingCustomer\(item\)\}\s*title="View Details"\s*style=\{\{.*?\}\}\s*>\s*<Eye size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => setViewingCustomer(item)} title="View Details" style={{ color: "#2250A1" }}><Eye size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => openModal\(item\)\}\s*title="Edit Customer"\s*style=\{\{.*?\}\}\s*>\s*<Edit2 size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => openModal(item)} title="Edit Customer"><Edit2 size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleDeactivate\(item\)\}\s*title="Deactivate Customer"\s*style=\{\{.*?\}\}\s*>\s*<PowerOff size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleDeactivate(item)} title="Deactivate Customer" style={{ color: "#EF4444" }}><PowerOff size={16} /></Button>',
    content,
    flags=re.DOTALL
)

# Modal
modal_code = r'''<Modal isOpen={isModalOpen} onClose={closeModal} title={editingCustomer ? 'Edit Customer' : 'Add Customer'} width="450px">
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
          
          <FormField label="Code">
            <Input
              placeholder="e.g. TELKOM (will be converted to uppercase)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Attn / PIC">
              <Input
                value={formData.attnName}
                onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
              />
            </FormField>
            
            <FormField label="Phone">
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>
          
          <FormField label="Address">
            <Textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

content = re.sub(r'\{/\* Add / Edit Modal \*/\}.*', '{/* Add / Edit Modal */}\n      ' + modal_code + '\n    </div>\n  );\n};\nexport default Customers;\n', content, flags=re.DOTALL)

with open('frontend/src/pages/Customers.tsx', 'w') as f:
    f.write(content)

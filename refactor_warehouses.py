import re

with open('frontend/src/pages/Warehouses.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace(
    "import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';",
    "import { Eye, Edit2, PowerOff, ArrowLeft } from 'lucide-react';\nimport { Button, Input, FormField, Modal, StatusBadge, PageHeader, Card } from '../components/ui/index.js';"
)

content = content.replace(
    """<span className={`badge-status ${item.isActive ? 'active' : 'inactive'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>""",
    """<StatusBadge status={item.isActive} />"""
)
content = content.replace(
    """<span className={`badge-status ${viewingWarehouse.isActive ? 'active' : 'inactive'}`}>
                {viewingWarehouse.isActive ? 'Active' : 'Inactive'}
              </span>""",
    """<StatusBadge status={viewingWarehouse.isActive} />"""
)

# Detail Header
detail_header = r'''<PageHeader
          title={viewingWarehouse.name}
          description="Warehouse detailed configurations and current stock status."
          actions={
            <Button variant="ghost" onClick={() => setViewingWarehouse(null)}>
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
content = content.replace('<div className="content-card" style={{ padding: \'24px\', marginBottom: \'24px\' }}>', '<Card style={{ marginBottom: \'24px\' }}>')

# Stock Detail section card
content = content.replace('<div className="content-card" style={{ padding: 0 }}>', '<Card style={{ padding: 0 }}>')
content = content.replace('/>\n        </div>\n      </div>\n    );\n  }', '/>\n        </Card>\n      </div>\n    );\n  }')

# PageHeader Main
page_header = r'''<PageHeader
        title="Warehouses"
        description="Manage warehouse hubs, regional settings, locations, and inventory levels."
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
              Add Warehouse
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

# Table closing card
content = content.replace('/>\n      </div>\n\n      {/* Add / Edit Modal */}', '/>\n      </Card>\n\n      {/* Add / Edit Modal */}')

# Action Buttons
content = re.sub(
    r'<button\s*onClick=\{\(\) => setViewingWarehouse\(item\)\}\s*title="View Details & Stock"\s*style=\{\{.*?\}\}\s*>\s*<Eye size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => setViewingWarehouse(item)} title="View Details & Stock" style={{ color: "#2250A1" }}><Eye size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => openModal\(item\)\}\s*title="Edit Warehouse"\s*style=\{\{.*?\}\}\s*>\s*<Edit2 size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => openModal(item)} title="Edit Warehouse"><Edit2 size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleDeactivate\(item\)\}\s*title="Deactivate Warehouse"\s*style=\{\{.*?\}\}\s*>\s*<PowerOff size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleDeactivate(item)} title="Deactivate Warehouse" style={{ color: "#EF4444" }}><PowerOff size={16} /></Button>',
    content,
    flags=re.DOTALL
)

# Modal
modal_code = r'''<Modal isOpen={isModalOpen} onClose={closeModal} title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'} width="450px">
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="City" required>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </FormField>
            
            <FormField label="City Code">
              <Input
                disabled
                value={editingWarehouse ? formData.cityCode : 'Generated automatically'}
              />
            </FormField>
          </div>
          
          <FormField label="Location Address" required>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
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

content = re.sub(r'\{/\* Add / Edit Modal \*/\}.*', '{/* Add / Edit Modal */}\n      ' + modal_code + '\n    </div>\n  );\n};\nexport default Warehouses;\n', content, flags=re.DOTALL)

with open('frontend/src/pages/Warehouses.tsx', 'w') as f:
    f.write(content)

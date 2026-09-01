import re

with open('frontend/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace(
    "import {\n  Eye,\n  Edit2,\n  ArrowLeft,\n  CheckCircle2,\n  Archive,\n  RotateCcw,\n  Boxes,\n  Truck,\n} from 'lucide-react';",
    "import {\n  Eye,\n  Edit2,\n  ArrowLeft,\n  CheckCircle2,\n  Archive,\n  RotateCcw,\n  Boxes,\n  Truck,\n} from 'lucide-react';\nimport { Button, Input, Select, FormField, Modal, StatusBadge, PageHeader, Card } from '../components/ui/index.js';"
)
content = content.replace(
    "import { Eye, Edit2, ArrowLeft, CheckCircle2, Archive, RotateCcw, Boxes, Truck } from 'lucide-react';",
    "import { Eye, Edit2, ArrowLeft, CheckCircle2, Archive, RotateCcw, Boxes, Truck } from 'lucide-react';\nimport { Button, Input, Select, FormField, Modal, StatusBadge, PageHeader, Card } from '../components/ui/index.js';"
)


# Replace renderStatusBadge
render_badge_code = r'''  const renderStatusBadge = (status: string) => {
    return <StatusBadge status={status} />;
  };'''

content = re.sub(
    r'const renderStatusBadge = \(status: string\) => \{[\s\S]*?^  \};',
    render_badge_code,
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Detail Header -> PageHeader
detail_header = r'''<PageHeader
          title={viewingProject?.name || 'Loading project...'}
          description="Project specifications, location, inventory, and delivery tracking."
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft size={16} /> Back
              </Button>
              {viewingProject && (
                <>
                  <Button variant="secondary" onClick={() => openModal(viewingProject)}>
                    <Edit2 size={14} /> Edit
                  </Button>
                  {viewingProject.status === 'ACTIVE' && (
                    <>
                      <Button variant="secondary" onClick={() => handleStatusChange(viewingProject, 'COMPLETED')} style={{ color: '#10B981', borderColor: '#10B981' }}>
                        <CheckCircle2 size={14} /> Mark Completed
                      </Button>
                      <Button variant="secondary" onClick={() => handleStatusChange(viewingProject, 'ARCHIVED')} style={{ color: '#6B7280', borderColor: '#6B7280' }}>
                        <Archive size={14} /> Archive
                      </Button>
                    </>
                  )}
                  {(viewingProject.status === 'COMPLETED' || viewingProject.status === 'ARCHIVED') && (
                    <Button variant="secondary" onClick={() => handleStatusChange(viewingProject, 'ACTIVE')} style={{ color: '#2250A1', borderColor: '#2250A1' }}>
                      <RotateCcw size={14} /> Reactivate
                    </Button>
                  )}
                </>
              )}
            </div>
          }
        />'''

content = re.sub(
    r'\{/\* Detail Header \*/\}.*?\{viewingProject && \([\s\S]*?</div>\s*\)\}\s*</div>',
    '{/* Detail Header */}\n        ' + detail_header,
    content,
    flags=re.DOTALL
)

# Replace <div className="content-card"...> with <Card...>
content = re.sub(
    r'<div className="content-card" style=\{\{ padding: \'32px\', textAlign: \'center\', color: \'#6B7280\' \}\}>',
    r'<Card style={{ padding: "32px", textAlign: "center", color: "#6B7280" }}>',
    content
)
content = re.sub(
    r'<div className="content-card" style=\{\{ padding: \'24px\', marginBottom: \'24px\' \}\}>',
    r'<Card style={{ marginBottom: "24px" }}>',
    content
)
content = re.sub(
    r'<div className="content-card" style=\{\{ padding: \'24px\' \}\}>',
    r'<Card>',
    content
)
content = re.sub(
    r'<div className="content-card" style=\{\{ padding: 0 \}\}>',
    r'<Card style={{ padding: 0 }}>',
    content
)
# Close tags for those Cards
content = content.replace(
    'No inventory items currently assigned to this project.\n                </div>\n              )}\n            </div>',
    'No inventory items currently assigned to this project.\n                </div>\n              )}\n            </Card>'
)
content = content.replace(
    'No delivery orders linked to this project.\n                </div>\n              )}\n            </div>\n          </>\n        ) : null}',
    'No delivery orders linked to this project.\n                </div>\n              )}\n            </Card>\n          </>\n        ) : null}'
)
content = content.replace(
    'Loading project details...\n          </div>\n        ) : viewingProject \? \(',
    'Loading project details...\n          </Card>\n        ) : viewingProject ? ('
)
content = content.replace(
    '{viewingProject.endedAt ? new Date(viewingProject.endedAt).toLocaleDateString() : "-"}\n                  </span>\n                </div>\n              </div>\n            </div>',
    '{viewingProject.endedAt ? new Date(viewingProject.endedAt).toLocaleDateString() : "-"}\n                  </span>\n                </div>\n              </div>\n            </Card>'
)
content = content.replace(
    '/>\n      </div>\n\n      {/* Add / Edit Modal */}',
    '/>\n      </Card>\n\n      {/* Add / Edit Modal */}'
)

# Main PageHeader
page_header = r'''<PageHeader
        title="Projects"
        description="Manage client and internal project assignments, locations, and inventory."
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
              <option value="ACTIVE">Active Only</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>
            <Button variant="primary" onClick={() => openModal()}>
              Add Project
            </Button>
          </>
        }
      />'''

content = re.sub(
    r'<div\s*style=\{\{\s*display: \'flex\',\s*justifyContent: \'space-between\',\s*alignItems: \'center\',\s*marginBottom: \'24px\',\s*flexWrap: \'wrap\',\s*gap: \'12px\',\s*\}\}\s*>\s*<div>\s*<h2 style=\{\{ margin: 0, fontSize: \'24px\', fontWeight: 600, color: \'#1F2839\' \}\}>Projects</h2>[\s\S]*?</div>\s*</div>',
    page_header,
    content
)

# Buttons in listColumns
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleViewProject\(item\.id\)\}\s*title="View Details"\s*style=\{\{.*?\}\}\s*>\s*<Eye size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleViewProject(item.id)} title="View Details" style={{ color: "#2250A1" }}><Eye size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => openModal\(item\)\}\s*title="Edit Project"\s*style=\{\{.*?\}\}\s*>\s*<Edit2 size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => openModal(item)} title="Edit Project"><Edit2 size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleStatusChange\(item, \'COMPLETED\'\)\}\s*title="Mark Completed"\s*style=\{\{.*?\}\}\s*>\s*<CheckCircle2 size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleStatusChange(item, "COMPLETED")} title="Mark Completed" style={{ color: "#10B981" }}><CheckCircle2 size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleStatusChange\(item, \'ARCHIVED\'\)\}\s*title="Archive Project"\s*style=\{\{.*?\}\}\s*>\s*<Archive size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleStatusChange(item, "ARCHIVED")} title="Archive Project" style={{ color: "#6B7280" }}><Archive size={16} /></Button>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'<button\s*onClick=\{\(\) => handleStatusChange\(item, \'ACTIVE\'\)\}\s*title="Reactivate Project"\s*style=\{\{.*?\}\}\s*>\s*<RotateCcw size=\{16\} />\s*</button>',
    r'<Button variant="icon" onClick={() => handleStatusChange(item, "ACTIVE")} title="Reactivate Project" style={{ color: "#2250A1" }}><RotateCcw size={16} /></Button>',
    content,
    flags=re.DOTALL
)

# Modal Form
modal_code = r'''<Modal isOpen={isModalOpen} onClose={closeModal} title={editingProject ? 'Edit Project' : 'Add Project'} width="600px">
        {errorMsg && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Project Name" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>
            
            <FormField label="Job Number">
              <Input
                value={formData.jobNo}
                onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
              />
            </FormField>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Customer / Mitra">
              <Select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              >
                <option value="">Internal Project (No Customer)</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            
            <FormField label="Activity">
              <Input
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Attn / PIC">
              <Input
                value={formData.attnName}
                onChange={(e) => setFormData({ ...formData, attnName: e.target.value })}
              />
            </FormField>
            
            <FormField label="Project Leader">
              <Input
                value={formData.leaderName}
                onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
              />
            </FormField>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField label="Start Date">
              <Input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
              />
            </FormField>
            
            <FormField label="End Date">
              <Input
                type="date"
                value={formData.endedAt}
                onChange={(e) => setFormData({ ...formData, endedAt: e.target.value })}
              />
            </FormField>
          </div>
          
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

content = re.sub(r'\{/\* Add / Edit Modal \*/\}.*', '{/* Add / Edit Modal */}\n      ' + modal_code + '\n    </div>\n  );\n};\nexport default Projects;\n', content, flags=re.DOTALL)

with open('frontend/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

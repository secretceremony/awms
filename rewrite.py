import re

def refactor_stocklist():
    with open('frontend/src/pages/Inventory/StockList.tsx', 'r') as f:
        content = f.read()

    content = content.replace(
        "import { Link } from 'react-router-dom';",
        "import { Link } from 'react-router-dom';\nimport { Button, PageHeader, StatusBadge } from '../../components/ui/index.js';"
    )

    content = re.sub(
        r'<span className={`badge-tracking type-\$\{item\.trackingType\?\.toLowerCase\(\)\}`}>\s*\{item\.trackingType\}\s*</span>',
        r'<StatusBadge status={item.trackingType} />',
        content
    )

    content = re.sub(
        r'<div style={{display: \'flex\', justifyContent: \'space-between\', marginBottom: \'1rem\'}}>\s*<h2>Inventory Items</h2>\s*<div>\s*<Link to="/inventory/new"><button style={{marginRight: \'1rem\'}}>Add Item</button></Link>\s*<Link to="/inventory/initial-stock"><button>Add Initial Stock</button></Link>\s*</div>\s*</div>',
        r'''<PageHeader
        title="Inventory Items"
        actions={
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/inventory/new"><Button variant="primary">Add Item</Button></Link>
            <Link to="/inventory/initial-stock"><Button variant="secondary">Add Initial Stock</Button></Link>
          </div>
        }
      />''',
        content
    )

    with open('frontend/src/pages/Inventory/StockList.tsx', 'w') as f:
        f.write(content)

def refactor_itemform():
    with open('frontend/src/pages/Inventory/ItemForm.tsx', 'r') as f:
        content = f.read()
        
    content = content.replace(
        "import { apiClient } from '../../api/client.js';",
        "import { apiClient } from '../../api/client.js';\nimport { Button, Input, Select, FormField, PageHeader, Card } from '../../components/ui/index.js';"
    )
    
    # replace form HTML
    new_form = r'''<Card>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <FormField label="Name" required>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </FormField>
          
          <FormField label="Brand">
            <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
          </FormField>
          
          <FormField label="Unit" required>
            <Select value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})} required>
              <option value="">Select Unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </FormField>
          
          <FormField label="Tracking Type">
            <Select value={formData.trackingType} onChange={e => setFormData({...formData, trackingType: e.target.value})} disabled={!!id}>
              <option value="BULK">Bulk</option>
              <option value="SERIALIZED">Serialized</option>
            </Select>
          </FormField>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button type="submit" variant="primary">Save</Button>
          </div>
        </form>
      </Card>'''
      
    content = re.sub(r'<form onSubmit=\{handleSubmit\}.*?</form>', new_form, content, flags=re.DOTALL)
    
    content = re.sub(
        r'<h2>\{id \? \'Edit Item\' : \'Create Item\'\}</h2>',
        r'<PageHeader title={id ? "Edit Item" : "Create Item"} />',
        content
    )
    
    with open('frontend/src/pages/Inventory/ItemForm.tsx', 'w') as f:
        f.write(content)

refactor_stocklist()
refactor_itemform()

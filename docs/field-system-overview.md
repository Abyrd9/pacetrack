# Field Definition System

## Overview

Field Definitions are **TypeScript/Zod schemas** (not database tables) that define custom fields for pipeline templates. They can be attached to:
- **Items** - The entities moving through a pipeline (e.g., deals, candidates, orders)
- **Pipelines** - Metadata for entire pipeline instances (e.g., quarter, territory, budget)

**Field definitions live in code** and field **values** are stored in JSONB columns on items and pipeline instances.

---

## Field Definition Schema

### TypeScript/Zod Schema

```typescript
import { z } from "zod";

const FieldDefinitionSchema = z.object({
  // Basic info
  name: z.string(),              // Internal identifier: "deal_value"
  label: z.string(),             // Display name: "Deal Value"
  description: z.string().optional(),
  field_type: FieldTypeEnum,     // text, number, dropdown, etc.
  scope: FieldScopeEnum,         // "item" | "pipeline"
  
  // Validation
  is_required: z.boolean().default(false),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  pattern: z.string().optional(),     // Regex
  min_length: z.number().optional(),
  max_length: z.number().optional(),
  
  // Options (for dropdown/multiselect)
  options: z.array(FieldOptionSchema).optional(),
  
  // Display
  placeholder: z.string().optional(),
  default_value: z.unknown().optional(),
  help_text: z.string().optional(),
  category: z.string().optional(),    // Group fields
  display_order: z.number().default(0),
});
```

---

## Field Types

| Type | Description | Stored As | Example |
|------|-------------|-----------|---------|
| `text` | Single-line text | string | "John Doe" |
| `textarea` | Multi-line text | string | "Long description..." |
| `number` | Numeric value | number | 42 |
| `currency` | Money value | number | 150000 (cents) |
| `percentage` | Percentage | number | 25.5 |
| `date` | Date only | ISO string | "2024-01-15" |
| `datetime` | Date + time | ISO string | "2024-01-15T10:30:00Z" |
| `boolean` | True/false | boolean | true |
| `dropdown` | Single select | string | "option_1" |
| `multiselect` | Multiple select | string[] | ["opt1", "opt2"] |
| `url` | Website URL | string | "https://example.com" |
| `email` | Email address | string | "user@example.com" |
| `phone` | Phone number | string | "+1-555-0100" |
| `user` | User reference | string (account_id) | "acc_123..." |

---

## Usage in Items

Items store field values in a JSONB column:

```typescript
// item table
{
  id: string
  pipeline_instance_id: string
  current_step_id: string
  field_values: Record<string, unknown>  // JSONB
  ...
}

// Example field_values for a Sales Pipeline item:
{
  "deal_value": 150000,
  "close_date": "2024-03-15",
  "lead_source": "inbound",
  "decision_maker": "acc_abc123",
  "competitor": "CompetitorCo",
  "company_size": 250,
  "industry": "saas"
}
```

---

## Usage in Pipeline Instances

Pipeline instances also store field values in JSONB:

```typescript
// pipeline_instance table
{
  id: string
  pipeline_template_id: string
  name: string
  field_values: Record<string, unknown>  // JSONB
  ...
}

// Example field_values for a Sales Pipeline:
{
  "sales_quarter": "Q1 2024",
  "territory": "west",
  "team_goal": 2500000,
  "assigned_rep": "acc_xyz789"
}
```

---

## Use Case Examples

### Sales Pipeline

**Item Fields:**
```typescript
[
  {
    name: "deal_value",
    label: "Deal Value",
    field_type: "currency",
    scope: "item",
    is_required: true,
    min_value: 5000,
  },
  {
    name: "close_date",
    label: "Expected Close Date",
    field_type: "date",
    scope: "item",
  },
  {
    name: "lead_source",
    label: "Lead Source",
    field_type: "dropdown",
    scope: "item",
    options: [
      { value: "inbound", label: "Inbound" },
      { value: "outbound", label: "Outbound" },
      { value: "referral", label: "Referral" },
      { value: "partner", label: "Partner" },
    ],
  },
]
```

**Pipeline Fields:**
```typescript
[
  {
    name: "sales_quarter",
    label: "Sales Quarter",
    field_type: "text",
    scope: "pipeline",
  },
  {
    name: "territory",
    label: "Territory",
    field_type: "dropdown",
    scope: "pipeline",
    options: [
      { value: "west", label: "West" },
      { value: "east", label: "East" },
      { value: "central", label: "Central" },
    ],
  },
  {
    name: "team_goal",
    label: "Team Goal",
    field_type: "currency",
    scope: "pipeline",
  },
]
```

### Recruiting Pipeline

**Item Fields:**
```typescript
[
  {
    name: "position",
    label: "Position",
    field_type: "dropdown",
    scope: "item",
    is_required: true,
    options: [
      { value: "senior_eng", label: "Senior Engineer" },
      { value: "staff_eng", label: "Staff Engineer" },
      { value: "principal", label: "Principal Engineer" },
    ],
  },
  {
    name: "salary_expectation",
    label: "Salary Expectation",
    field_type: "currency",
    scope: "item",
  },
  {
    name: "tech_stack",
    label: "Tech Stack",
    field_type: "multiselect",
    scope: "item",
    options: [
      { value: "react", label: "React" },
      { value: "node", label: "Node.js" },
      { value: "python", label: "Python" },
      { value: "go", label: "Go" },
    ],
  },
  {
    name: "resume_url",
    label: "Resume URL",
    field_type: "url",
    scope: "item",
  },
]
```

---

## Field Configuration per Step

Step templates can configure which fields are visible/required at each step:

```typescript
// step_template table
{
  id: string
  pipeline_template_id: string
  name: string
  field_configs: Array<{
    field_definition_id: string
    is_visible: boolean
    is_required: boolean
  }>
  ...
}

// Example: Sales Pipeline "Qualified" step
{
  field_configs: [
    {
      field_definition_id: "field_deal_value",
      is_visible: true,
      is_required: true,
    },
    {
      field_definition_id: "field_decision_maker",
      is_visible: true,
      is_required: true,
    },
    {
      field_definition_id: "field_close_date",
      is_visible: true,
      is_required: false,
    },
  ]
}
```

---

## Validation Rules

Field definitions support validation:

### Text Fields
- `min_length` / `max_length` - Character limits
- `pattern` - Regex pattern (e.g., phone format)

### Number/Currency/Percentage
- `min_value` / `max_value` - Numeric range

### Dropdowns/Multiselect
- Must match one of the `options` values

### Required Fields
- `is_required` - Must have a value before saving

---

## Implementation Path

### Phase 1: Field Values Storage ✅ Next
1. Add `field_values` JSONB column to `items` table (when items are created)
2. Add `field_values` JSONB column to `pipeline_instances` table
3. Create TypeScript types for field value storage

### Phase 2: Field Definitions in Pipeline Templates
1. Add `item_field_definitions` to pipeline template config
2. Add `pipeline_field_definitions` to pipeline template config
3. Build UI for defining fields when creating pipeline templates

### Phase 3: Step Configuration
1. Add `field_configs` to `step_templates` table (JSONB)
2. Implement field visibility/required logic per step
3. Build UI for configuring which fields appear at each step

### Phase 4: Dynamic Forms
1. Build dynamic form renderer that reads field definitions
2. Implement field value validation
3. Build field input components for each field type
4. Validate before step transitions

### Phase 5: Advanced Features
1. Calculated fields (e.g., `weighted_value = deal_value * probability`)
2. Conditional visibility (show field X if field Y has value Z)
3. Field value history/audit trail
4. Field templates for common use cases

---

## Benefits of Schema-Only Approach

✅ **No database overhead** - Field definitions live in code, not DB  
✅ **Version controlled** - Field definition changes tracked in git  
✅ **Type-safe** - Full TypeScript support  
✅ **Fast** - No DB queries to fetch field configs  
✅ **Validated** - Zod ensures correctness  
✅ **Flexible** - Easy to iterate and change  
✅ **Portable** - Field definitions can be shared/exported  

---

## Next Steps

1. ✅ Define field schemas (done)
2. Add `field_values` JSONB to items table (when creating items feature)
3. Add `field_values` JSONB to pipeline_instances table
4. Add field definitions to pipeline template creation UI
5. Build dynamic form renderer
6. Implement validation engine
7. Create pre-built field definition sets for common pipelines


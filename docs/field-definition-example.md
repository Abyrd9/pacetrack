# Field Definition Examples

## Overview

Field definitions are **TypeScript/Zod schemas** (not database tables) that define custom fields for your pipeline templates. They can be attached to:
- **Items** - The entities moving through a pipeline (deals, candidates, orders)
- **Pipelines** - Metadata for pipeline instances (quarter, territory, budget)

---

## Basic Usage

### Import the Schema

```typescript
import { 
  FieldDefinitionSchema,
  type FieldDefinition,
  type TextField,
  type CurrencyField,
  type DateField,
  type DropdownField,
  type UserField,
  type FieldValues 
} from "@pacetrack/schema";
```

### Define Fields for Your Pipeline Template

Each field type has its own schema with type-specific properties. Use discriminated unions:

```typescript
// Sales Pipeline - Item Fields
const salesItemFields: FieldDefinition[] = [
  {
    type: "currency",
    name: "deal_value",
    label: "Deal Value",
    is_required: true,
    min_value: 5000,
    help_text: "Total value of the deal in USD",
    currency_code: "USD",
  },
  {
    type: "date",
    name: "close_date",
    label: "Expected Close Date",
    is_required: false,
  },
  {
    type: "dropdown",
    name: "lead_source",
    label: "Lead Source",
    is_required: true,
    options: [
      { value: "inbound", label: "Inbound" },
      { value: "outbound", label: "Outbound" },
      { value: "referral", label: "Referral" },
      { value: "partner", label: "Partner" },
    ],
  },
  {
    type: "user",
    name: "decision_maker",
    label: "Decision Maker",
    help_text: "Primary contact for the deal",
  },
];

// Sales Pipeline - Pipeline Fields
const salesPipelineFields: FieldDefinition[] = [
  {
    type: "text",
    name: "sales_quarter",
    label: "Sales Quarter",
    is_required: true,
    placeholder: "Q1 2024",
  },
  {
    type: "dropdown",
    name: "territory",
    label: "Territory",
    options: [
      { value: "west", label: "West" },
      { value: "east", label: "East" },
      { value: "central", label: "Central" },
    ],
  },
  {
    type: "currency",
    name: "team_goal",
    label: "Team Goal",
    min_value: 0,
    help_text: "Quarterly revenue target",
  },
];
```

---

## Where Field Definitions Live

### Option 1: In Pipeline Template Config

```typescript
// In your pipeline template creation
const salesPipelineTemplate = {
  name: "Enterprise B2B Sales Process",
  description: "Track deals from lead to close",
  field_definitions: {
    item: salesItemFields,
    pipeline: salesPipelineFields,
  },
  steps: [...],
};
```

### Option 2: Separate Config Files

```typescript
// config/pipelines/sales-pipeline-fields.ts
export const SALES_ITEM_FIELDS: FieldDefinition[] = [...];
export const SALES_PIPELINE_FIELDS: FieldDefinition[] = [...];

// Then import where needed
import { SALES_ITEM_FIELDS } from "~/config/pipelines/sales-pipeline-fields";
```

---

## Field Values Storage

Field values are stored in JSONB columns:

### In Items Table

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  pipeline_instance_id TEXT NOT NULL,
  current_step_id TEXT NOT NULL,
  field_values JSONB DEFAULT '{}',  -- <-- Field values here
  ...
);
```

```typescript
// Example item with field values
const item = {
  id: "item_123",
  pipeline_instance_id: "pi_456",
  current_step_id: "step_789",
  field_values: {
    deal_value: 150000,
    close_date: "2024-03-15",
    lead_source: "inbound",
    decision_maker: "acc_xyz123",
    competitor: "CompetitorCo",
  },
  // ... other fields
};
```

### In Pipeline Instances Table

```sql
CREATE TABLE pipeline_instances (
  id TEXT PRIMARY KEY,
  pipeline_template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  field_values JSONB DEFAULT '{}',  -- <-- Field values here
  ...
);
```

```typescript
// Example pipeline instance with field values
const pipelineInstance = {
  id: "pi_456",
  pipeline_template_id: "pt_123",
  name: "Q1 2024 Sales Pipeline",
  field_values: {
    sales_quarter: "Q1 2024",
    territory: "west",
    team_goal: 2500000,
  },
  // ... other fields
};
```

---

## Field Configuration Per Step

Steps can specify which fields are visible/required:

```typescript
// In step template config
const qualifiedStep = {
  name: "Qualified",
  order: 1,
  field_configs: [
    {
      field_name: "deal_value",
      is_visible: true,
      is_required: true,
    },
    {
      field_name: "decision_maker",
      is_visible: true,
      is_required: true,
    },
    {
      field_name: "lead_source",
      is_visible: true,
      is_required: false,
    },
  ],
};
```

---

## Complete Examples

### Sales Pipeline

```typescript
import type { FieldDefinition } from "@pacetrack/schema";

export const SALES_PIPELINE_FIELDS = {
  item: [
    {
      type: "currency",
      name: "deal_value",
      label: "Deal Value",
      is_required: true,
      min_value: 5000,
      help_text: "Total contract value",
      category: "Financial",
      display_order: 1,
      currency_code: "USD",
    },
    {
      type: "date",
      name: "close_date",
      label: "Expected Close Date",
      help_text: "When you expect to close this deal",
      category: "Timeline",
      display_order: 2,
    },
    {
      type: "dropdown",
      name: "lead_source",
      label: "Lead Source",
      is_required: true,
      options: [
        { value: "inbound", label: "Inbound", color: "#10b981" },
        { value: "outbound", label: "Outbound", color: "#3b82f6" },
        { value: "referral", label: "Referral", color: "#8b5cf6" },
        { value: "partner", label: "Partner", color: "#f59e0b" },
      ],
      category: "Source",
      display_order: 3,
    },
    {
      type: "user",
      name: "decision_maker",
      label: "Decision Maker",
      help_text: "Primary contact",
      category: "Contact",
      display_order: 4,
    },
    {
      type: "text",
      name: "competitor",
      label: "Main Competitor",
      placeholder: "Who are they evaluating?",
      category: "Intelligence",
      display_order: 5,
    },
    {
      type: "number",
      name: "company_size",
      label: "Company Size",
      help_text: "Employee count",
      category: "Qualification",
      display_order: 6,
      suffix: "employees",
    },
  ] as FieldDefinition[],

  pipeline: [
    {
      type: "text",
      name: "sales_quarter",
      label: "Sales Quarter",
      is_required: true,
      placeholder: "Q1 2024",
      display_order: 1,
    },
    {
      type: "dropdown",
      name: "territory",
      label: "Territory",
      is_required: true,
      options: [
        { value: "west", label: "West" },
        { value: "east", label: "East" },
        { value: "central", label: "Central" },
        { value: "international", label: "International" },
      ],
      display_order: 2,
    },
    {
      type: "currency",
      name: "team_goal",
      label: "Team Goal",
      min_value: 0,
      help_text: "Quarterly revenue target",
      display_order: 3,
      currency_code: "USD",
    },
  ] as FieldDefinition[],
};
```

### Recruiting Pipeline

```typescript
export const RECRUITING_PIPELINE_FIELDS = {
  item: [
    {
      type: "dropdown",
      name: "position",
      label: "Position",
      is_required: true,
      options: [
        { value: "senior_eng", label: "Senior Engineer" },
        { value: "staff_eng", label: "Staff Engineer" },
        { value: "principal", label: "Principal Engineer" },
      ],
      display_order: 1,
    },
    {
      type: "currency",
      name: "salary_expectation",
      label: "Salary Expectation",
      help_text: "Annual compensation",
      display_order: 2,
      currency_code: "USD",
    },
    {
      type: "multiselect",
      name: "tech_stack",
      label: "Tech Stack",
      options: [
        { value: "react", label: "React" },
        { value: "node", label: "Node.js" },
        { value: "python", label: "Python" },
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
      ],
      display_order: 3,
    },
    {
      type: "number",
      name: "years_experience",
      label: "Years of Experience",
      min_value: 0,
      max_value: 50,
      display_order: 4,
      suffix: "years",
    },
    {
      type: "url",
      name: "resume_url",
      label: "Resume URL",
      placeholder: "https://...",
      display_order: 5,
    },
    {
      type: "url",
      name: "linkedin_profile",
      label: "LinkedIn Profile",
      pattern: "^https://([a-z]{2,3}\\.)?linkedin\\.com/.*$",
      placeholder: "https://linkedin.com/in/...",
      display_order: 6,
    },
  ] as FieldDefinition[],

  pipeline: [
    {
      type: "dropdown",
      name: "department",
      label: "Department",
      options: [
        { value: "engineering", label: "Engineering" },
        { value: "product", label: "Product" },
        { value: "design", label: "Design" },
      ],
      display_order: 1,
    },
    {
      type: "user",
      name: "hiring_manager",
      label: "Hiring Manager",
      is_required: true,
      display_order: 2,
    },
    {
      type: "number",
      name: "target_headcount",
      label: "Target Headcount",
      help_text: "How many positions to fill",
      min_value: 1,
      display_order: 3,
      suffix: "positions",
    },
  ] as FieldDefinition[],
};
```

---

## Validation

Use Zod to validate field definitions:

```typescript
import { FieldDefinitionSchema } from "@pacetrack/schema";

// Validate a single field
const result = FieldDefinitionSchema.safeParse({
  name: "deal_value",
  label: "Deal Value",
  field_type: "currency",
  scope: "item",
  is_required: true,
});

if (!result.success) {
  console.error("Invalid field definition:", result.error);
}
```

Validate field values:

```typescript
import { FieldValuesSchema } from "@pacetrack/schema";

// Validate field values for an item
const result = FieldValuesSchema.safeParse({
  deal_value: 150000,
  close_date: "2024-03-15",
  lead_source: "inbound",
});
```

---

## Benefits of Schema-Only Approach

✅ **No database overhead** - Field definitions live in code  
✅ **Version controlled** - Changes tracked in git  
✅ **Type-safe** - Full TypeScript support  
✅ **Fast** - No DB queries to fetch field configs  
✅ **Validated** - Zod ensures correctness  
✅ **Flexible** - Easy to iterate and change  

---

## Next Steps

1. ✅ Define field schemas (done)
2. Add `field_values` JSONB column to `items` table
3. Add `field_values` JSONB column to `pipeline_instances` table
4. Add `field_configs` JSONB to `step_templates` table
5. Build dynamic form renderer based on field definitions
6. Implement field validation logic
7. Create pre-built field definition sets for common use cases


# Step Configuration Implementation Plan

## Overview

This document outlines the implementation strategy for advanced step configuration features in PaceTrack. These features enable industry-specific workflows, automations, and data validation as demonstrated in the use cases.

---

## Core Concepts

### 1. Field Configurations (`field_configs`)
**What:** Controls which custom fields are visible/required at specific steps.

**Purpose:** Show/hide and require specific data based on the current step.

**Example from Use Cases:**
```typescript
// Sales Pipeline - Qualified Step
field_configs: [
  { field_definition_id: "deal_value", is_visible: true, is_required: true },
  { field_definition_id: "decision_maker", is_visible: true, is_required: true }
]
```

**Use Cases:**
- Sales: Require deal value before moving to proposal
- Recruiting: Show tech stack field only during technical screen
- Medical: Require insurance auth before diagnostic testing
- Manufacturing: Show defect notes only in quality inspection

---

### 2. Validations (`validations`)
**What:** Business rules that must be satisfied before advancing to next step.

**Purpose:** Enforce data quality and business logic.

**Example from Use Cases:**
```typescript
// Sales Pipeline - Qualified Step
validations: [
  {
    id: "min_deal_value",
    type: "field_min_value",
    field_id: "deal_value",
    min_value: 5000,
    error_message: "Deals under $5k should go to SMB pipeline"
  }
]
```

**Validation Types Needed:**
- `field_required` - Field must have a value
- `field_min_value` - Numeric field minimum
- `field_max_value` - Numeric field maximum
- `field_pattern` - Regex pattern match
- `field_comparison` - Compare two fields (e.g., start_date < end_date)
- `custom_expression` - JavaScript expression evaluation

**Use Cases:**
- Sales: Minimum deal value thresholds
- Recruiting: Required tech stack before interviews
- Manufacturing: Quality status must be set
- Medical: Insurance authorization required

---

### 3. Assignments (`assignments`)
**What:** Auto-assign pipeline items to users/groups when entering a step.

**Purpose:** Route work to the right team/person automatically.

**Example from Use Cases:**
```typescript
// Recruiting - Technical Screen Step
assignments: [
  { type: "account_group", id: "engineering_interviewers" }
]

// Manufacturing - Material Procurement Step
assignments: [
  { type: "user", id: "procurement_specialist_id" }
]
```

**Assignment Types:**
- `user` - Assign to specific user
- `account_group` - Assign to everyone in a group
- `role` - Assign to users with specific role
- `round_robin` - Rotate among group members
- `least_assigned` - Assign to person with fewest items

**Use Cases:**
- Sales: SDR team → Qualified, AE team → Demo
- Recruiting: Recruiters → Screen, Engineers → Technical
- Manufacturing: Procurement team → Materials, QA → Inspection
- Marketing: Content team → Creation, Design team → Production

---

### 4. Notifications (`notifications`)
**What:** Alert users when specific events/conditions occur.

**Purpose:** Keep stakeholders informed and prevent items from stalling.

**Example from Use Cases:**
```typescript
// Sales - Negotiation Step
notifications: [
  {
    id: "stalled_negotiation",
    trigger: "at_risk",
    threshold_days: 15,
    recipients: [
      { type: "owner" },
      { type: "user", id: "sales_manager_id" }
    ],
    template: "negotiation_stalled"
  }
]
```

**Trigger Types:**
- `on_enter` - When item enters step
- `on_exit` - When item leaves step
- `on_duration` - After X days in step
- `at_risk` - When exceeding target duration
- `on_field_change` - When specific field changes

**Recipient Types:**
- `owner` - Item owner
- `assignees` - All assigned users
- `user` - Specific user by ID
- `account_group` - Everyone in group
- `role` - Users with specific role

**Use Cases:**
- Sales: Notify VP when large deal enters negotiation
- Recruiting: Alert when offer about to expire
- Manufacturing: Alert manager when rework needed
- Marketing: Warn when content creation delayed
- Medical: Daily post-op assessment reminders

---

### 5. Automations (`automations`)
**What:** Execute actions automatically when triggers fire.

**Purpose:** Integrate with external systems, create dependent tasks, update fields.

**Example from Use Cases:**
```typescript
// Recruiting - Offer Extended Step
automations: [
  {
    id: "create_onboarding_ticket",
    trigger: "on_enter",
    action: {
      type: "webhook",
      target: "https://api.company.com/onboarding/create",
      data: { candidate_id: "{{item.id}}" }
    }
  }
]
```

**Action Types:**
- `webhook` - HTTP POST to external URL
- `update_field` - Set field value automatically
- `notify` - Send notification (overlaps with notifications)
- `create_item` - Create related item in another pipeline
- `assign` - Change assignment
- `move_to_step` - Force move to different step (conditional routing)

**Use Cases:**
- Sales: Create Salesforce opportunity when qualified
- Recruiting: Trigger onboarding workflow on hire
- Manufacturing: Update inventory system on material order
- Marketing: Sync campaign performance data daily
- Film: Generate daily production reports

---

### 6. Calculations (`calculations`)
**What:** Compute derived values from other fields.

**Purpose:** Auto-calculate metrics, costs, scores.

**Example from Use Cases:**
```typescript
// Manufacturing - Material Procurement Step
calculations: [
  {
    id: "material_cost",
    name: "Calculate Material Cost",
    type: "custom",
    expression: "dimensions.sqft * material.cost_per_sqft",
    output_field_id: "material_cost_field"
  }
]

// Marketing - Live Campaign Step
calculations: [
  {
    id: "roi_calculation",
    name: "Calculate Current ROI",
    type: "custom",
    expression: "((actual_leads * avg_lead_value) - actual_spend) / actual_spend * 100",
    output_field_id: "current_roi"
  }
]
```

**Calculation Types:**
- `sum` - Add multiple fields
- `average` - Average of fields
- `percentage` - (numerator / denominator) * 100
- `date_diff` - Days between two dates
- `custom` - JavaScript expression

**Use Cases:**
- Manufacturing: Material costs, production time estimates
- Marketing: ROI calculations, conversion rates
- Sales: Discount percentages, commission amounts
- Medical: BMI, medication dosages

---

### 7. Metadata (Generic Key-Value)
**What:** Flexible configuration storage for step-specific settings.

**Purpose:** Store arbitrary step configuration without schema changes.

**Example from Use Cases:**
```typescript
// Recruiting - Technical Screen Step
metadata: {
  requires_approval: true // Hiring manager must approve
}

// Medical - Post-Op Recovery Step
metadata: {
  requires_approval: true // Physician must approve discharge
}
```

**Use Cases:**
- Approval requirements
- Color coding for UI
- Integration settings
- Feature flags per step
- Custom behavior flags

---

## Database Schema Design

### Step Template Table
```sql
CREATE TABLE step_template (
  id UUID PRIMARY KEY,
  pipeline_template_id UUID REFERENCES pipeline_template(id),
  name TEXT NOT NULL,
  description TEXT,
  order INTEGER NOT NULL,
  target_duration_days INTEGER,
  color TEXT,
  icon TEXT,
  
  -- JSON configuration columns
  field_configs JSONB DEFAULT '[]',
  validations JSONB DEFAULT '[]',
  assignments JSONB DEFAULT '[]',
  notifications JSONB DEFAULT '[]',
  automations JSONB DEFAULT '[]',
  calculations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  tenant_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Field Definition Table (Prerequisite)
```sql
CREATE TABLE field_definition (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL, -- text, number, date, dropdown, multiselect, etc.
  scope TEXT NOT NULL, -- 'item' or 'pipeline'
  
  -- For dropdowns/multiselect
  options JSONB DEFAULT '[]',
  
  -- Validation rules
  is_required BOOLEAN DEFAULT false,
  min_value NUMERIC,
  max_value NUMERIC,
  pattern TEXT, -- Regex
  
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Step Instance Table (Runtime)
```sql
CREATE TABLE step (
  id UUID PRIMARY KEY,
  pipeline_instance_id UUID REFERENCES pipeline_instance(id),
  step_template_id UUID REFERENCES step_template(id),
  name TEXT NOT NULL,
  order INTEGER NOT NULL,
  status TEXT NOT NULL, -- not_started, in_progress, completed
  
  entered_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Store overridden config if needed
  config_overrides JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Item Table (The thing moving through pipeline)
```sql
CREATE TABLE item (
  id UUID PRIMARY KEY,
  pipeline_instance_id UUID REFERENCES pipeline_instance(id),
  current_step_id UUID REFERENCES step(id),
  
  -- Dynamic field values stored as JSON
  field_values JSONB DEFAULT '{}',
  
  -- Assignment tracking
  owner_account_id UUID,
  assigned_account_ids JSONB DEFAULT '[]',
  
  status TEXT NOT NULL, -- active, completed, archived
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up basic infrastructure

**Tasks:**
1. **Field Definitions System**
   - Create `field_definition` table
   - CRUD API endpoints
   - UI for creating custom fields
   - Field type definitions (text, number, date, dropdown, etc.)

2. **Step Configuration Storage**
   - Add JSON columns to `step_template` table
   - Migration scripts
   - TypeScript types for all config structures

3. **Item & Field Values**
   - Create `item` table
   - Store field values in JSONB
   - Basic getter/setter functions

**Deliverables:**
- Can create custom fields
- Can store field values on items
- Can save step configurations (even if not enforced yet)

---

### Phase 2: Field Configurations (Week 3)
**Goal:** Control field visibility and requirements per step

**Tasks:**
1. **Field Config Logic**
   - Function to get visible fields for a step
   - Function to get required fields for a step
   - Apply configs when rendering item form

2. **UI Components**
   - Dynamic form builder based on field configs
   - Show/hide fields based on current step
   - Mark required fields with asterisk

3. **API Validation**
   - Server-side validation of required fields
   - Prevent step advancement if required fields missing

**Deliverables:**
- Fields show/hide based on step
- Required fields enforced before moving to next step
- Clean form UI that adapts to configuration

**Example Use Case Test:** Sales Pipeline - Require deal value at Qualified step

---

### Phase 3: Validations (Week 4)
**Goal:** Enforce business rules

**Tasks:**
1. **Validation Engine**
   - Validation rule parser
   - Validators for each type (min, max, pattern, required, etc.)
   - Custom expression evaluator (safe sandbox)

2. **Validation Execution**
   - Run validations on step transition
   - Return clear error messages
   - Block advancement if validation fails

3. **UI Feedback**
   - Show validation errors inline
   - Highlight invalid fields
   - Summary of all validation issues

**Deliverables:**
- All validation types working
- Clear error messages
- Cannot advance step with validation errors

**Example Use Case Test:** Sales - Minimum $5k deal value for enterprise pipeline

---

### Phase 4: Assignments (Week 5)
**Goal:** Auto-route work to right people

**Tasks:**
1. **Assignment System**
   - Assignment logic for each type
   - Round-robin distribution
   - Least-assigned algorithm

2. **Assignment Execution**
   - Auto-assign on step enter
   - Update `item.assigned_account_ids`
   - Notify assigned users

3. **UI Updates**
   - Show assignments on item detail
   - Allow manual reassignment
   - Team workload view

**Deliverables:**
- Auto-assignment working on step transition
- Support for user, group, role, round-robin
- Users notified of new assignments

**Example Use Case Test:** Recruiting - Auto-assign to engineering_interviewers group

---

### Phase 5: Notifications (Week 6-7)
**Goal:** Alert users to important events

**Tasks:**
1. **Notification Infrastructure**
   - Notification queue/scheduler
   - Email templates
   - In-app notification system
   - Recipient resolution logic

2. **Trigger System**
   - Event listeners for triggers (on_enter, on_exit, etc.)
   - Duration-based checks (daily job)
   - At-risk detection algorithm

3. **Notification Delivery**
   - Send emails
   - Create in-app notifications
   - Track notification history

4. **UI Components**
   - In-app notification center
   - Email preference settings
   - Notification log

**Deliverables:**
- All trigger types working
- Email and in-app notifications
- Users can manage preferences

**Example Use Case Test:** Sales - Notify VP when deal > $100k enters negotiation

---

### Phase 6: Automations (Week 8-9)
**Goal:** Execute actions automatically

**Tasks:**
1. **Automation Engine**
   - Action executor for each type
   - Webhook sender with retry logic
   - Field updater
   - Template variable replacement ({{item.id}}, etc.)

2. **Integration Helpers**
   - Webhook signing
   - OAuth support for integrations
   - Async job processing

3. **Automation UI**
   - Automation builder interface
   - Test automation button
   - Execution history/logs

**Deliverables:**
- Webhooks fire reliably
- Field updates work
- Automation logs for debugging

**Example Use Case Test:** Recruiting - Create onboarding ticket when offer accepted

---

### Phase 7: Calculations (Week 10)
**Goal:** Auto-compute derived values

**Tasks:**
1. **Calculation Engine**
   - Expression parser
   - Safe math evaluator
   - Support for common functions (sum, avg, etc.)

2. **Calculation Execution**
   - Trigger on field change
   - Trigger on step transition
   - Update output field automatically

3. **Calculation UI**
   - Formula builder
   - Calculation preview
   - Test with sample data

**Deliverables:**
- All calculation types working
- Formulas update in real-time
- Safe expression evaluation

**Example Use Case Test:** Manufacturing - Calculate material cost from dimensions

---

### Phase 8: Advanced Features (Week 11-12)
**Goal:** Polish and advanced scenarios

**Tasks:**
1. **Conditional Routing**
   - Move to different steps based on conditions
   - Loop back to earlier steps (rework)

2. **Approval Workflows**
   - Requires approval flag
   - Approval request/response
   - Block advancement until approved

3. **Batch Operations**
   - Bulk move items through steps
   - Bulk assignment changes

4. **Analytics**
   - Automation success rates
   - Validation failure tracking
   - Assignment workload balancing

**Deliverables:**
- Approval workflows functional
- Conditional step routing
- Admin analytics dashboard

**Example Use Case Test:** Medical - Require physician approval before discharge

---

## Technical Architecture

### Configuration Storage Strategy

**Option 1: Pure JSONB (Recommended)**
```typescript
// step_template.field_configs
[
  {
    field_definition_id: "uuid",
    is_visible: true,
    is_required: true
  }
]
```

**Pros:**
- Flexible, no schema changes needed
- Easy to version configurations
- Simple to copy/duplicate templates

**Cons:**
- No foreign key constraints
- Must validate JSON structure
- Queries on JSONB can be complex

**Option 2: Separate Tables**
```sql
CREATE TABLE step_field_config (
  id UUID PRIMARY KEY,
  step_template_id UUID REFERENCES step_template(id),
  field_definition_id UUID REFERENCES field_definition(id),
  is_visible BOOLEAN,
  is_required BOOLEAN
);
```

**Pros:**
- Proper foreign keys
- Easier queries
- Better data integrity

**Cons:**
- More tables to manage
- Harder to version/copy
- More complex joins

**Decision:** Use **Option 1 (JSONB)** for flexibility, but include validation at API layer.

---

### Validation Engine Design

```typescript
// validation-engine.ts
interface ValidationRule {
  id: string;
  type: 'field_required' | 'field_min_value' | 'field_max_value' | 'field_pattern' | 'custom_expression';
  field_id: string;
  error_message: string;
  // Type-specific properties
  min_value?: number;
  max_value?: number;
  pattern?: string;
  expression?: string;
}

interface ValidationContext {
  item: Item;
  field_values: Record<string, unknown>;
  field_definitions: FieldDefinition[];
  step: StepTemplate;
}

class ValidationEngine {
  async validate(
    rules: ValidationRule[],
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    for (const rule of rules) {
      const validator = this.getValidator(rule.type);
      const result = await validator.validate(rule, context);
      
      if (!result.valid) {
        errors.push({
          rule_id: rule.id,
          field_id: rule.field_id,
          message: rule.error_message,
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  private getValidator(type: string): Validator {
    // Return appropriate validator instance
  }
}
```

---

### Notification Scheduler Design

```typescript
// notification-scheduler.ts
class NotificationScheduler {
  async checkAtRiskItems() {
    // Run daily job
    const items = await db.query.item.findMany({
      where: eq(item.status, 'active'),
      with: {
        current_step: {
          with: { step_template: true }
        }
      }
    });
    
    for (const item of items) {
      const config = item.current_step.step_template.notifications;
      
      for (const notif of config.filter(n => n.trigger === 'at_risk')) {
        if (this.isAtRisk(item, notif)) {
          await this.sendNotification(item, notif);
        }
      }
    }
  }
  
  private isAtRisk(item: Item, config: NotificationConfig): boolean {
    const daysInStep = daysBetween(item.current_step.entered_at, new Date());
    const target = item.current_step.step_template.target_duration_days;
    
    return daysInStep > target + (config.threshold_days || 0);
  }
}
```

---

### Automation Executor Design

```typescript
// automation-executor.ts
class AutomationExecutor {
  async execute(automation: Automation, item: Item) {
    try {
      const action = automation.action;
      
      switch (action.type) {
        case 'webhook':
          await this.executeWebhook(action, item);
          break;
        case 'update_field':
          await this.updateField(action, item);
          break;
        case 'notify':
          await this.sendNotification(action, item);
          break;
        // ... other action types
      }
      
      await this.logSuccess(automation, item);
    } catch (error) {
      await this.logFailure(automation, item, error);
      // Retry logic if needed
    }
  }
  
  private async executeWebhook(action: WebhookAction, item: Item) {
    const url = action.target;
    const data = this.interpolateTemplate(action.data, item);
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PaceTrack-Signature': this.sign(data),
      },
      body: JSON.stringify(data),
    });
  }
  
  private interpolateTemplate(template: unknown, item: Item): unknown {
    // Replace {{item.id}}, {{field.deal_value}}, etc.
  }
}
```

---

## UI/UX Considerations

### Step Configuration UI

**Location:** Pipeline Template Edit → Step Details → "Advanced" Tab

**Sections:**
1. **Field Configuration**
   - Drag-and-drop field list
   - Toggle visibility/required per field
   
2. **Validations**
   - Add validation rule button
   - Rule type dropdown
   - Visual rule builder
   
3. **Assignments**
   - Select assignment strategy
   - Choose users/groups
   
4. **Notifications**
   - List of notification rules
   - Trigger dropdown
   - Recipient selector
   - Template editor
   
5. **Automations**
   - Action type selector
   - Webhook URL input
   - Test button
   - Execution log
   
6. **Calculations**
   - Formula editor with autocomplete
   - Test with sample values
   - Output field selector

---

### Item Detail UI

**Dynamic Form:**
- Only show fields configured for current step
- Mark required fields
- Show validation errors inline

**Step Transition:**
- "Move to Next Step" button
- Run validations before moving
- Show checklist of requirements

**Assignment Display:**
- Show current assignees
- Allow reassignment
- Show notification preferences

**Activity Log:**
- Show automation executions
- Show notifications sent
- Show validation failures

---

## API Endpoints Needed

### Field Definitions
```
POST   /api/field-definition/create
GET    /api/field-definition/list
GET    /api/field-definition/get?id={id}
POST   /api/field-definition/update
POST   /api/field-definition/delete
```

### Step Configuration
```
POST   /api/step-template/update-field-configs
POST   /api/step-template/update-validations
POST   /api/step-template/update-assignments
POST   /api/step-template/update-notifications
POST   /api/step-template/update-automations
POST   /api/step-template/update-calculations
```

### Items
```
POST   /api/item/create
GET    /api/item/get?id={id}
POST   /api/item/update-fields
POST   /api/item/move-to-step
POST   /api/item/assign
GET    /api/item/validation-status
```

### Notifications
```
GET    /api/notification/list
POST   /api/notification/mark-read
POST   /api/notification/preferences
```

### Automation Logs
```
GET    /api/automation-log/list?item_id={id}
POST   /api/automation/test
```

---

## Testing Strategy

### Unit Tests
- Validation engine: Each validation type
- Calculation engine: Expression parsing
- Assignment logic: Round-robin, least-assigned
- Notification triggers: Date math

### Integration Tests
- Full item lifecycle through pipeline
- Webhook delivery with retries
- Email sending
- Notification scheduling

### E2E Tests
- Create pipeline with all configs
- Move item through steps
- Verify automations fired
- Check notifications delivered

### Use Case Tests
For each use case in `use-cases.md`:
1. Recreate pipeline template
2. Add example items
3. Move through steps
4. Verify all configs work as expected

---

## Migration Strategy

### Existing Data
- Current `step_template` table has basic fields
- Add new JSON columns with defaults
- Existing templates continue working
- Gradually add configurations

### Rollout Plan
1. **Beta Feature Flag** - Enable for select tenants
2. **Template Library** - Pre-built templates for common use cases
3. **Migration Tool** - Convert old configs to new structure
4. **Documentation** - Comprehensive guides for each feature
5. **Training** - Video tutorials, examples

---

## Security Considerations

### Expression Sandboxing
- Never use `eval()` directly
- Use safe expression evaluator (e.g., `expr-eval` library)
- Whitelist allowed functions
- Limit execution time
- Prevent access to global scope

### Webhook Security
- Sign requests with HMAC
- Support OAuth for authenticated endpoints
- Rate limit outgoing webhooks
- Validate webhook URLs
- Retry with exponential backoff

### Access Control
- Check permissions before executing automations
- Validate user can access fields
- Ensure notifications respect tenant boundaries
- Log all automation executions

---

## Performance Considerations

### JSONB Indexing
```sql
CREATE INDEX idx_step_template_field_configs ON step_template USING GIN (field_configs);
CREATE INDEX idx_item_field_values ON item USING GIN (field_values);
```

### Caching
- Cache field definitions per tenant
- Cache step configurations
- Cache validation rules
- Invalidate on update

### Async Processing
- Queue webhook calls
- Batch notifications
- Background calculation updates
- Daily at-risk checks

---

## Documentation Needs

### For Developers
- Architecture overview
- API documentation
- Configuration schemas
- Example implementations

### For Users
- Field definition guide
- Validation rule builder
- Automation recipes
- Best practices per use case

### For Admins
- Performance tuning
- Monitoring automation health
- Troubleshooting guide
- Security checklist

---

## Success Metrics

### Engineering
- All use case scenarios working
- < 100ms validation execution
- 99.9% webhook delivery rate
- Zero expression eval vulnerabilities

### Product
- 80% of templates use field configs
- 50% use automations
- 30% use notifications
- High user satisfaction scores

### Business
- Enable all 6 use cases
- Reduce time-to-value for new customers
- Support custom enterprise workflows

---

## Conclusion

This plan provides a structured approach to implementing PaceTrack's advanced step configuration system. By breaking it into phases and focusing on one feature at a time, we can deliver value incrementally while maintaining quality.

The order of implementation (Field Configs → Validations → Assignments → Notifications → Automations → Calculations) builds on previous work and allows for early user testing and feedback.

Each phase includes clear deliverables, test criteria from real use cases, and technical implementation details to guide development.


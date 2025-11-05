# PaceTrack Use Cases

This document outlines 6 real-world use cases demonstrating how PaceTrack's universal pipeline velocity tracking can be applied across different industries.

---

## 1. Sales Pipeline

### Overview
Track deals from initial lead to closed-won, measuring conversion rates and identifying bottlenecks in the sales process.

### Template: "Enterprise B2B Sales Process"

**Steps:**
1. **New Lead** (Target: 1 day)
   - Initial contact captured
   - Lead source recorded
2. **Qualified** (Target: 3 days)
   - BANT criteria assessed (Budget, Authority, Need, Timeline)
   - Decision maker identified
3. **Demo Scheduled** (Target: 2 days)
   - Product demonstration booked
   - Stakeholders identified
4. **Demo Completed** (Target: 5 days)
   - Solution presented
   - Technical requirements gathered
5. **Proposal Sent** (Target: 7 days)
   - Custom proposal created
   - Pricing finalized
6. **Negotiation** (Target: 10 days)
   - Contract terms discussed
   - Legal review in progress
7. **Closed Won** (Terminal)
   - Contract signed
   - Deal value realized
8. **Closed Lost** (Terminal)
   - Opportunity lost
   - Loss reason documented

**Custom Fields (Item-level):**
- **Deal Value** (Currency) - Required in Proposal step
- **Close Date** (Date) - Estimated close date
- **Lead Source** (Dropdown) - Inbound, Outbound, Referral, Partner
- **Competitor** (Text) - Who are they evaluating?
- **Decision Maker** (User) - Primary contact
- **Company Size** (Number) - Employee count
- **Industry** (Dropdown) - SaaS, Manufacturing, Healthcare, etc.
- **Lost Reason** (Dropdown) - Only visible in Closed Lost

**Custom Fields (Pipeline-level):**
- **Sales Quarter** (Text) - Q1 2024, Q2 2024, etc.
- **Territory** (Dropdown) - West, East, Central, International
- **Team Goal** (Currency) - Quarterly target

**Step Configurations:**

*Qualified Step:*
```typescript
config: {
  field_configs: [
    { field_definition_id: "deal_value", is_visible: true, is_required: true },
    { field_definition_id: "decision_maker", is_visible: true, is_required: true }
  ],
  assignments: [
    { type: "account_group", id: "sdr_team" }
  ],
  validations: [
    {
      id: "min_deal_value",
      type: "field_min_value",
      field_id: "deal_value",
      min_value: 5000,
      error_message: "Deals under $5k should go to SMB pipeline"
    }
  ]
}
```

*Negotiation Step:*
```typescript
config: {
  automations: [
    {
      id: "escalate_large_deal",
      trigger: "on_enter",
      action: {
        type: "notify",
        target: "vp_sales_user_id",
        message: "High-value deal entered negotiation"
      },
      is_active: true
    }
  ],
  notifications: [
    {
      id: "stalled_negotiation",
      trigger: "at_risk",
      threshold_days: 15,
      recipients: [{ type: "owner" }, { type: "user", id: "sales_manager_id" }]
    }
  ]
}
```

**Velocity Metrics:**
- Average time to close: 28 days
- Conversion rate (Lead → Closed Won): 23%
- Stage conversion rates: Qualified → Demo (68%), Demo → Proposal (52%)
- At-risk deals: Items in Negotiation > 15 days
- Bottleneck detection: Which steps have highest average duration

**Instance Example:** "Q4 2024 Enterprise Sales Pipeline"
- Start Date: Oct 1, 2024
- End Date: Dec 31, 2024
- Goal: $2.5M in closed revenue
- Active Items: 47 deals

---

## 2. Recruiting Pipeline

### Overview
Track candidates from application to hire, measuring time-to-fill and identifying drop-off points in the hiring funnel.

### Template: "Engineering Hiring Process"

**Steps:**
1. **Applied** (Target: 1 day)
   - Resume received
   - Auto-screened for basic qualifications
2. **Recruiter Screen** (Target: 3 days)
   - 15-minute phone conversation
   - Culture fit assessment
3. **Technical Screen** (Target: 5 days)
   - 45-minute coding challenge
   - Problem-solving evaluation
4. **Onsite Interview** (Target: 7 days)
   - 4-hour interview loop
   - Team collaboration assessment
5. **Reference Check** (Target: 3 days)
   - Past employers contacted
   - Background verification
6. **Offer Extended** (Target: 5 days)
   - Compensation package created
   - Offer letter sent
7. **Hired** (Terminal)
   - Offer accepted
   - Start date scheduled
8. **Rejected** (Terminal)
   - Candidate declined or rejected
   - Reason documented

**Custom Fields (Item-level):**
- **Position** (Dropdown) - Senior Engineer, Staff Engineer, Principal
- **Salary Range** (Text) - e.g., "$150k-$180k"
- **Desired Salary** (Currency) - Candidate expectation
- **Years of Experience** (Number)
- **Tech Stack** (Multiselect) - React, Node, Python, Go, etc.
- **Location** (Dropdown) - Remote, SF, NYC, Austin
- **Referral Source** (User) - Who referred them?
- **Resume URL** (URL) - Link to resume
- **LinkedIn Profile** (URL)
- **Rejection Reason** (Dropdown) - Only in Rejected step

**Custom Fields (Pipeline-level):**
- **Department** (Dropdown) - Engineering, Product, Design
- **Hiring Manager** (User)
- **Target Headcount** (Number) - How many positions to fill
- **Budget** (Currency) - Total hiring budget

**Step Configurations:**

*Technical Screen Step:*
```typescript
config: {
  field_configs: [
    { field_definition_id: "tech_stack", is_visible: true, is_required: true },
    { field_definition_id: "years_experience", is_visible: true, is_required: false }
  ],
  assignments: [
    { type: "account_group", id: "engineering_interviewers" }
  ],
  validations: [
    {
      id: "tech_stack_match",
      type: "field_required",
      field_id: "tech_stack",
      error_message: "Must specify candidate's tech stack before technical screen"
    }
  ],
  metadata: {
    requires_approval: true // Hiring manager must approve
  }
}
```

*Offer Extended Step:*
```typescript
config: {
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
  ],
  notifications: [
    {
      id: "offer_expiring",
      trigger: "on_duration",
      duration_days: 7,
      recipients: [
        { type: "owner" },
        { type: "user", id: "talent_acquisition_lead" }
      ],
      template: "offer_about_to_expire"
    }
  ]
}
```

**Velocity Metrics:**
- Average time to hire: 32 days
- Offer acceptance rate: 78%
- Stage drop-off: Applied → Screen (40% decline rate)
- Interview-to-hire ratio: 1:4 (4 onsites per hire)
- At-risk candidates: Items in Offer Extended > 7 days

**Instance Example:** "Q1 2024 Engineering Hiring"
- Start Date: Jan 1, 2024
- End Date: Mar 31, 2024
- Goal: Hire 8 senior engineers
- Active Items: 23 candidates

---

## 3. Manufacturing Pipeline

### Overview
Track production orders from initial request to delivery, measuring cycle time and identifying production bottlenecks.

### Template: "Custom Furniture Manufacturing"

**Steps:**
1. **Order Received** (Target: 1 day)
   - Customer order placed
   - Initial specifications captured
2. **Design Review** (Target: 3 days)
   - CAD drawings created
   - Material requirements identified
3. **Material Procurement** (Target: 7 days)
   - Wood, fabric, hardware ordered
   - Supplier lead times considered
4. **Cut & Prep** (Target: 2 days)
   - Materials cut to size
   - Surface preparation completed
5. **Assembly** (Target: 5 days)
   - Components assembled
   - Joinery completed
6. **Finishing** (Target: 4 days)
   - Staining or painting
   - Protective coating applied
7. **Quality Inspection** (Target: 1 day)
   - Defect check
   - Customer specifications verified
8. **Packaging & Shipping** (Target: 2 days)
   - Protective packaging
   - Carrier scheduled
9. **Delivered** (Terminal)
   - Customer received order
   - Payment collected
10. **Rejected/Rework** (Loops back to appropriate step)
    - Quality issues identified
    - Rework required

**Custom Fields (Item-level):**
- **Order Number** (Text) - Unique identifier
- **Customer Name** (Text)
- **Product Type** (Dropdown) - Dining Table, Bookshelf, Cabinet
- **Dimensions** (Text) - L x W x H
- **Material** (Dropdown) - Oak, Walnut, Maple, Pine
- **Finish Type** (Dropdown) - Stain, Paint, Natural
- **Order Value** (Currency)
- **Estimated Weight** (Number) - For shipping
- **Special Instructions** (Textarea)
- **Defect Notes** (Textarea) - Only visible in Quality Inspection

**Custom Fields (Pipeline-level):**
- **Production Facility** (Dropdown) - Workshop A, Workshop B
- **Production Manager** (User)
- **Batch Number** (Text) - e.g., "2024-Q1-B03"

**Step Configurations:**

*Material Procurement Step:*
```typescript
config: {
  field_configs: [
    { field_definition_id: "material", is_visible: true, is_required: true },
    { field_definition_id: "dimensions", is_visible: true, is_required: true }
  ],
  assignments: [
    { type: "user", id: "procurement_specialist_id" }
  ],
  calculations: [
    {
      id: "material_cost",
      name: "Calculate Material Cost",
      type: "custom",
      expression: "dimensions.sqft * material.cost_per_sqft",
      output_field_id: "material_cost_field"
    }
  ]
}
```

*Quality Inspection Step:*
```typescript
config: {
  validations: [
    {
      id: "inspection_passed",
      type: "field_required",
      field_id: "quality_status",
      error_message: "Must mark quality inspection as passed/failed"
    }
  ],
  automations: [
    {
      id: "rework_notification",
      trigger: "on_exit",
      action: {
        type: "notify",
        target: "production_manager_id",
        message: "Item requires rework"
      }
    }
  ]
}
```

**Velocity Metrics:**
- Average production cycle: 25 days
- On-time delivery rate: 87%
- Rework rate: 5% (items needing quality fixes)
- Bottleneck: Material Procurement (avg 9 days vs 7 day target)
- Throughput: 12 orders completed per week

**Instance Example:** "March 2024 Production Run"
- Start Date: Mar 1, 2024
- End Date: Mar 31, 2024
- Goal: Complete 50 orders
- Active Items: 34 orders in progress

---

## 4. Marketing Campaign Pipeline

### Overview
Track marketing campaigns from ideation to completion, measuring ROI and optimizing campaign performance.

### Template: "Content Marketing Campaign"

**Steps:**
1. **Ideation** (Target: 2 days)
   - Campaign concept proposed
   - Target audience identified
2. **Strategy & Planning** (Target: 5 days)
   - Campaign goals defined
   - Budget allocated
   - Timeline created
3. **Content Creation** (Target: 10 days)
   - Blog posts, videos, graphics created
   - Copy written and reviewed
4. **Design & Production** (Target: 7 days)
   - Visual assets designed
   - Landing pages built
5. **Review & Approval** (Target: 3 days)
   - Stakeholder review
   - Legal/compliance check
6. **Launch Preparation** (Target: 2 days)
   - Email sequences scheduled
   - Social media posts queued
   - Tracking pixels installed
7. **Live Campaign** (Target: 30 days)
   - Campaign running
   - Performance monitored
8. **Analysis & Reporting** (Target: 5 days)
   - ROI calculated
   - Learnings documented
9. **Completed** (Terminal)
   - Campaign results presented
   - Assets archived

**Custom Fields (Item-level):**
- **Campaign Name** (Text)
- **Campaign Type** (Dropdown) - Email, Social, Content, Paid Ads, Webinar
- **Target Audience** (Multiselect) - SMB, Enterprise, Developers, Executives
- **Budget** (Currency)
- **Expected ROI** (Percentage)
- **Lead Goal** (Number) - Target number of leads
- **Channels** (Multiselect) - LinkedIn, Twitter, Email, Blog, YouTube
- **Primary CTA** (Text) - Call-to-action
- **Landing Page URL** (URL)
- **Campaign Owner** (User)
- **Actual Leads Generated** (Number) - Filled during Live Campaign
- **Actual Spend** (Currency) - Tracked during campaign
- **Conversion Rate** (Percentage) - Calculated in Analysis

**Custom Fields (Pipeline-level):**
- **Quarter** (Text) - Q1 2024, Q2 2024
- **Marketing Theme** (Text) - e.g., "Product Launch", "Thought Leadership"
- **Total Budget** (Currency) - Budget for all campaigns

**Step Configurations:**

*Content Creation Step:*
```typescript
config: {
  field_configs: [
    { field_definition_id: "campaign_type", is_visible: true, is_required: true },
    { field_definition_id: "channels", is_visible: true, is_required: true }
  ],
  assignments: [
    { type: "account_group", id: "content_team" }
  ],
  notifications: [
    {
      id: "content_delayed",
      trigger: "at_risk",
      threshold_days: 12,
      recipients: [{ type: "owner" }, { type: "user", id: "content_director_id" }],
      template: "content_creation_delayed"
    }
  ]
}
```

*Live Campaign Step:*
```typescript
config: {
  automations: [
    {
      id: "daily_performance_update",
      trigger: "on_duration",
      duration_days: 1,
      action: {
        type: "webhook",
        target: "https://analytics.company.com/campaign/{{item.id}}/sync"
      }
    }
  ],
  calculations: [
    {
      id: "roi_calculation",
      name: "Calculate Current ROI",
      type: "custom",
      expression: "((actual_leads * avg_lead_value) - actual_spend) / actual_spend * 100",
      output_field_id: "current_roi"
    }
  ]
}
```

**Velocity Metrics:**
- Average campaign launch time: 34 days (Ideation → Live)
- Campaign success rate: 65% (hit lead goal)
- Average ROI: 340%
- Time in review: 4.2 days average (target: 3 days)
- Content creation bottleneck: 40% of campaigns delayed here

**Instance Example:** "Q2 2024 Campaigns"
- Start Date: Apr 1, 2024
- End Date: Jun 30, 2024
- Goal: Launch 15 campaigns, generate 5,000 leads
- Active Items: 8 campaigns in various stages

---

## 5. Medical Patient Care Pipeline

### Overview
Track patients through a clinical care pathway, measuring treatment outcomes and identifying care delivery gaps.

### Template: "Orthopedic Surgery Pathway"

**Steps:**
1. **Initial Consult** (Target: 3 days)
   - Patient evaluation
   - Medical history reviewed
2. **Diagnostic Testing** (Target: 7 days)
   - X-rays, MRI, CT scans ordered
   - Lab work completed
3. **Treatment Planning** (Target: 5 days)
   - Diagnosis confirmed
   - Treatment options discussed
   - Surgery scheduled (if needed)
4. **Pre-Op Preparation** (Target: 14 days)
   - Pre-surgical clearance
   - Patient education
   - Consent forms signed
5. **Surgery** (Target: 1 day)
   - Procedure performed
   - Operating notes documented
6. **Post-Op Recovery** (Target: 2 days)
   - Hospital stay
   - Initial recovery monitoring
7. **Discharge** (Target: 1 day)
   - Discharge instructions provided
   - Follow-up appointments scheduled
8. **Physical Therapy** (Target: 60 days)
   - Rehabilitation exercises
   - Progress tracking
9. **Follow-Up Visit** (Target: 7 days after PT)
   - Recovery assessment
   - Return to normal activities cleared
10. **Discharged from Care** (Terminal)
    - Patient fully recovered
    - Care pathway completed

**Custom Fields (Item-level):**
- **Patient ID** (Text) - Medical record number
- **Patient Name** (Text)
- **Date of Birth** (Date)
- **Primary Diagnosis** (Dropdown) - ACL Tear, Hip Replacement, Rotator Cuff, etc.
- **Surgeon** (User)
- **Insurance Provider** (Dropdown)
- **Authorization Number** (Text) - Insurance pre-auth
- **Surgery Type** (Dropdown) - Arthroscopic, Open, Minimally Invasive
- **Risk Level** (Dropdown) - Low, Moderate, High
- **Pain Score** (Number) - 1-10 scale, updated at each visit
- **Mobility Score** (Number) - 1-10 scale
- **Complications** (Textarea) - Any adverse events
- **Next Appointment** (Date)

**Custom Fields (Pipeline-level):**
- **Care Facility** (Dropdown) - Main Hospital, Surgical Center A, Outpatient Clinic
- **Program Year** (Text) - "2024"
- **Clinical Coordinator** (User)

**Step Configurations:**

*Diagnostic Testing Step:*
```typescript
config: {
  field_configs: [
    { field_definition_id: "primary_diagnosis", is_visible: true, is_required: false },
    { field_definition_id: "risk_level", is_visible: true, is_required: true }
  ],
  assignments: [
    { type: "account_group", id: "radiology_team" }
  ],
  validations: [
    {
      id: "insurance_auth_required",
      type: "field_required",
      field_id: "authorization_number",
      error_message: "Insurance authorization required before diagnostic testing"
    }
  ]
}
```

*Post-Op Recovery Step:*
```typescript
config: {
  automations: [
    {
      id: "alert_high_risk",
      trigger: "on_enter",
      action: {
        type: "notify",
        target: "nursing_supervisor_id",
        message: "High-risk patient in post-op recovery"
      }
    }
  ],
  notifications: [
    {
      id: "daily_check",
      trigger: "on_duration",
      duration_days: 1,
      recipients: [{ type: "assignees" }],
      template: "post_op_daily_assessment"
    }
  ],
  metadata: {
    requires_approval: true // Physician must approve discharge
  }
}
```

**Velocity Metrics:**
- Average time to surgery: 29 days (Initial Consult → Surgery)
- Readmission rate: 2.3% (patients returning to hospital)
- Complication rate: 4.1%
- Patient satisfaction: 4.7/5.0
- Time to recovery: 85 days average (full pathway)
- Bottleneck: Pre-Op Preparation (insurance authorization delays)

**Instance Example:** "2024 Hip & Knee Replacement Program"
- Start Date: Jan 1, 2024
- End Date: Dec 31, 2024
- Goal: Complete 200 successful surgeries
- Active Items: 67 patients in various stages

---

## 6. Film Production Pipeline

### Overview
Track film/video projects from concept to distribution, managing complex creative workflows and deadlines.

### Template: "Feature Film Production"

**Steps:**
1. **Development** (Target: 60 days)
   - Script development
   - Financing secured
   - Key creative team hired
2. **Pre-Production** (Target: 45 days)
   - Casting completed
   - Locations scouted
   - Production schedule created
   - Crew hired
3. **Principal Photography** (Target: 30 days)
   - Filming in progress
   - Daily footage reviewed
4. **Wrap & Data Management** (Target: 3 days)
   - Strike sets
   - Footage backed up and organized
5. **Rough Cut** (Target: 30 days)
   - First assembly edit
   - Director's cut created
6. **Picture Lock** (Target: 20 days)
   - Final edit approved
   - No more picture changes
7. **Post-Production** (Target: 60 days)
   - Color grading
   - Sound design & mixing
   - VFX completion
   - Music composition
8. **Test Screening** (Target: 5 days)
   - Audience preview
   - Feedback collected
9. **Final Deliverables** (Target: 10 days)
   - DCP created (Digital Cinema Package)
   - Deliverables for distributors
10. **Distribution & Release** (Target: varies)
    - Festival submissions
    - Theatrical release
    - Streaming/VOD release
11. **Released** (Terminal)
    - Film publicly available

**Custom Fields (Item-level):**
- **Project Title** (Text)
- **Genre** (Dropdown) - Drama, Comedy, Thriller, Documentary
- **Director** (User)
- **Producer** (User)
- **Budget** (Currency)
- **Runtime Target** (Number) - Minutes
- **Shooting Days** (Number)
- **Production Company** (Text)
- **Distribution Strategy** (Dropdown) - Theatrical, Streaming, Festival Circuit
- **Key Cast** (Textarea) - Lead actors
- **Filming Locations** (Multiselect)
- **Release Date Target** (Date)
- **Current Budget Spend** (Currency) - Updated throughout
- **Audience Test Score** (Number) - 1-100 after test screening

**Custom Fields (Pipeline-level):**
- **Production Year** (Text) - "2024"
- **Studio** (Text) - Production company name
- **Slate** (Text) - "Summer 2024 Slate"

**Step Configurations:**

*Principal Photography Step:*
```typescript
config: {
  field_configs: [
    { field_definition_id: "shooting_days", is_visible: true, is_required: true },
    { field_definition_id: "current_budget_spend", is_visible: true, is_required: false }
  ],
  assignments: [
    { type: "user", id: "production_manager_id" },
    { type: "account_group", id: "camera_crew" }
  ],
  automations: [
    {
      id: "daily_production_report",
      trigger: "on_duration",
      duration_days: 1,
      action: {
        type: "webhook",
        target: "https://production.studio.com/daily-report",
        data: { project_id: "{{item.id}}", shoot_day: "{{current_day}}" }
      }
    }
  ],
  notifications: [
    {
      id: "over_budget_alert",
      trigger: "on_enter", // Check budget status
      recipients: [{ type: "user", id: "producer_id" }, { type: "user", id: "line_producer_id" }],
      template: "budget_warning"
    }
  ]
}
```

*Test Screening Step:*
```typescript
config: {
  validations: [
    {
      id: "test_score_required",
      type: "field_required",
      field_id: "audience_test_score",
      error_message: "Must record audience test screening scores"
    }
  ],
  automations: [
    {
      id: "recut_decision",
      trigger: "on_exit",
      action: {
        type: "notify",
        target: "director_id",
        message: "Review test screening feedback and decide on any changes"
      }
    }
  ]
}
```

**Velocity Metrics:**
- Average production timeline: 245 days (Development → Released)
- Budget variance: Track actual spend vs budget
- Schedule variance: Days ahead/behind schedule
- Test screening scores: Average 78/100
- Festival acceptance rate: 35%
- Bottleneck: Post-production (VFX delays common)
- On-time delivery rate: 67%

**Instance Example:** "2024 Feature Film Slate"
- Start Date: Jan 1, 2024
- End Date: Dec 31, 2024
- Goal: Complete and release 3 feature films
- Active Items: 5 films in various production stages

---

## Common Patterns Across Use Cases

### Shared Benefits
1. **Velocity Tracking** - Measure how fast items move through each step
2. **Bottleneck Identification** - Find which steps consistently take longer than target
3. **At-Risk Detection** - Alert teams when items are stalled
4. **Conversion Analytics** - Track drop-off rates between steps
5. **Resource Allocation** - Assign teams/users to steps based on workload
6. **Custom Workflows** - Each industry's unique process captured in flexible structure

### Flexible Configuration
- **Field Definitions** - Industry-specific data captured at item or pipeline level
- **Step Validations** - Prevent items from advancing without required information
- **Automations** - Trigger notifications, webhooks, assignments based on events
- **Terminal Steps** - Multiple end states (won/lost, completed/rejected, etc.)

### Analytics & Reporting
- Average time per step
- Overall cycle time
- Success/completion rates
- Historical trends
- Team/user performance
- Budget tracking (where applicable)

---

## Conclusion

PaceTrack's universal pipeline structure adapts to any industry by combining:
- **Flexible steps** that represent your unique process
- **Custom fields** that capture your domain-specific data
- **Configurable automations** that enforce your business rules
- **Velocity metrics** that reveal bottlenecks and inefficiencies

Whether you're closing deals, hiring talent, manufacturing products, launching campaigns, treating patients, or producing films—PaceTrack gives you visibility and control over your process.


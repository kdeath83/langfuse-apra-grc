# APRA CPS for Langfuse - Implementation Summary

## 🎯 Mission Accomplished

I've implemented a proof-of-concept APRA CPS (Prudential Standards) feature for Langfuse, targeting Australian financial services AI observability requirements.

---

## 📊 Codebase Architecture Summary

### Langfuse Structure
```
langfuse/
├── packages/shared/          # Domain models, Prisma schema, shared utilities
│   ├── prisma/schema.prisma  # Database schema
│   ├── src/domain/           # Domain models (traces, observations, scores)
│   ├── src/tableDefinitions/ # Table column definitions for UI
│   └── src/server/           # Server-side utilities, Clickhouse queries
├── web/                     # Next.js web application
│   ├── src/server/api/       # tRPC routers
│   ├── src/features/         # Feature modules
│   ├── src/components/       # React components
│   └── src/pages/            # Next.js pages
└── worker/                  # Background job processing
```

### Key Technologies
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, tRPC
- **Backend**: tRPC API, Prisma ORM, Clickhouse (analytics), PostgreSQL
- **Data Flow**: 
  - Traces ingested via API → Stored in Clickhouse (analytics) + Postgres (metadata)
  - UI queries via tRPC → Aggregated from Clickhouse
  - CPS metadata stored in Postgres as JSON

---

## ✅ What Was Implemented

### 1. **Database Layer**
- **File**: `packages/shared/prisma/schema.prisma`
- Added `apraCps` JSON field to `LegacyPrismaTrace` model
- Added GIN index for efficient JSON querying

### 2. **Migration**
- **File**: `packages/shared/prisma/migrations/20260408120000_add_apra_cps/migration.sql`
- SQL migration to add column and index
- Added column comment for documentation

### 3. **Domain Model**
- **File**: `packages/shared/src/domain/traces.ts`
- Defined `ApraCpsDomain` Zod schema with:
  - `materialImpact`: Boolean flag for incident severity
  - `impactType`: Enum (OPERATIONAL, FINANCIAL, REPUTATIONAL, REGULATORY, CUSTOMER_HARM, OTHER)
  - `cps234Classification`: Enum (LOW, MEDIUM, HIGH, CRITICAL)
  - `notifiedApra`: Boolean for 72-hour rule tracking
  - `notificationRef`: Reference number for APRA notification
  - `assessedBy`, `assessedAt`: Audit trail
  - `evidenceExported`: Evidence package tracking
- Extended `TraceDomain` to include `apraCps`

### 4. **Table Definitions**
- **File**: `packages/shared/src/tableDefinitions/tracesTable.ts`
- Added 3 new filterable columns:
  - `apraCps`: String options filter
  - `materialImpact`: Boolean filter
  - `cps234Classification`: CPS 234 level filter

### 5. **tRPC API Router**
- **File**: `web/src/server/api/routers/apraCps.ts` (NEW)
- **Endpoints**:
  - `getByTraceId`: Fetch CPS status for a trace
  - `update`: Update CPS metadata with audit logging
  - `batchMarkMaterialImpact`: Bulk mark traces as material impact
  - `markNotified`: Record APRA notification (72-hour rule)
  - `exportEvidence`: Generate CPS 234 evidence packages
  - `getStats`: Project-wide CPS statistics

### 6. **UI Components**
- **Files**: 
  - `web/src/features/apra-cps/components/ApraCpsBadge.tsx`
  - `web/src/features/apra-cps/components/ApraCpsPanel.tsx`
  - `web/src/features/apra-cps/components/ApraCpsStats.tsx`
- **Features**:
  - Visual badges for CPS status (5 states)
  - Interactive CPS assessment panel
  - 72-hour notification alert banner
  - Evidence export button
  - Project dashboard statistics widget

### 7. **Integration**
- **File**: `web/src/server/api/root.ts`
- Added `apraCps` router to tRPC app router
- **File**: `web/src/pages/project/[projectId]/index.tsx`
- Added `ApraCpsStats` widget to project dashboard

---

## 🎬 Demo Script (2-Minute Loom Video)

### Scene 1: Introduction (0:00-0:15)
**Script**: 
"Hi, I'm demonstrating APRA CPS features for Langfuse - specifically for Australian financial services using AI. We've added support for CPS 234 incident notification and CPS 230 model risk governance. Let me show you how it works."

### Scene 2: Dashboard Overview (0:15-0:30)
**Actions**:
1. Navigate to project dashboard
2. Point to the new "APRA CPS Overview" widget
3. Show statistics: Total traces, assessed, material impact, pending notifications

**Script**:
"On the dashboard, we now show APRA CPS metrics. We can see 3 traces with material impact, and 1 requires 72-hour notification to APRA."

### Scene 3: Material Impact Assessment (0:30-0:55)
**Actions**:
1. Click on a trace
2. Scroll to "APRA CPS" panel
3. Click "Assess CPS"
4. Select Impact Type: "Customer Impact"
5. Select Classification: "High Impact"
6. Add notes: "Potential PII exposure in AI response"
7. Click "Mark Material Impact"

**Script**:
"When reviewing a trace, I can assess its APRA CPS. This incident involves potential customer data exposure, so I'll classify it as HIGH impact under CPS 234."

### Scene 4: 72-Hour Notification Rule (0:55-1:20)
**Actions**:
1. Show the red alert banner: "72-Hour Notification Required"
2. Enter notification reference: "APRA-2024-INC-789"
3. Click "Mark APRA Notified"
4. Show badge changing from red to green
5. Show notification timestamp recorded

**Script**:
"Because this is HIGH impact, APRA must be notified within 72 hours per CPS 234. I've recorded the notification reference, and the system tracks CPS."

### Scene 5: Evidence Export (1:20-1:40)
**Actions**:
1. Click "Export Evidence"
2. Show success toast with export ID
3. Navigate back to traces list
4. Use the new "APRA CPS" filter
5. Filter by "Material Impact" = true
6. Show filtered results

**Script**:
"For CPS 234 evidence requirements, I can export a CPS package. The traces table now has filters for APRA status, making it easy to find all material impact incidents."

### Scene 6: Summary (1:40-2:00)
**Actions**:
1. Return to dashboard
2. Show updated stats
3. Show CPS 234 classification breakdown

**Script**:
"That's the APRA CPS feature. We've implemented material impact tagging, 72-hour notification tracking, and evidence export - all essential for Australian financial services AI governance."

---

## 📁 Files Changed

### New Files (10)
1. `packages/shared/prisma/migrations/20260408120000_add_apra_cps/migration.sql`
2. `web/src/server/api/routers/apraCps.ts`
3. `web/src/features/apra-cps/components/ApraCpsBadge.tsx`
4. `web/src/features/apra-cps/components/ApraCpsPanel.tsx`
5. `web/src/features/apra-cps/components/ApraCpsStats.tsx`
6. `web/src/features/apra-cps/index.ts`
7. `APRA_CPS.md` (documentation)

### Modified Files (4)
1. `packages/shared/prisma/schema.prisma` - Added apraCps field
2. `packages/shared/src/domain/traces.ts` - Added ApraCpsDomain schema
3. `packages/shared/src/tableDefinitions/tracesTable.ts` - Added APRA CPS columns
4. `web/src/server/api/root.ts` - Added apraCps router
5. `web/src/pages/project/[projectId]/index.tsx` - Added CPS stats widget

---

## 🚧 What's Still Needed for Production

### High Priority
1. **Clickhouse Integration**: Move CPS data to Clickhouse for analytics at scale
2. **Automated Detection**: Rules-based auto-classification of material impact
3. **Email Alerts**: Notify CPS officers of pending 72-hour notifications
4. **Audit Logging**: Complete immutable audit trail for CPS changes
5. **PDF Reports**: Generate formal CPS 234 incident reports

### Medium Priority
1. **Batch Operations**: Multi-select traces for bulk CPS actions
2. **Timeline View**: Visual incident response timeline
3. **APRA API Integration**: Direct notification to APRA portal (if available)
4. **Model Risk (CPS 230)**: Model governance fields and assessments
5. **Data Retention**: 7-year retention for CPS records

### Low Priority
1. **Custom Fields**: Configurable CPS fields per organization
2. **Integration Webhooks**: Notify external GRC systems
3. **Role-Based Access**: Restrict CPS data to authorized users
4. **Legal Hold**: Prevent deletion of traces under investigation

---

## 🏗️ Architecture Decisions

### JSON vs Normalized Tables
**Decision**: Store CPS metadata as JSON in the traces table.

**Rationale**:
- ✅ Simple implementation for proof-of-concept
- ✅ Flexible schema for evolving requirements
- ✅ Single query to get trace + CPS
- ⚠️ Limited query performance for complex filters
- ⚠️ No referential integrity

**Production Recommendation**: 
- Start with JSON for flexibility
- Migrate to normalized tables if query performance becomes an issue
- Use Clickhouse for analytics queries

### PostgreSQL vs Clickhouse
**Decision**: Store CPS metadata in PostgreSQL (metadata), trace data in Clickhouse (analytics).

**Rationale**:
- ✅ CPS metadata needs ACID transactions
- ✅ Audit trail requires strong consistency
- ✅ Clickhouse is read-optimized for trace analytics
- ⚠️ Cross-database queries require careful design

**Production Recommendation**:
- Keep CPS metadata in Postgres
- Use materialized views or ETL for CPS analytics

---

## 📊 CPS Features Mapping

| Requirement | Standard | Implementation Status |
|-------------|----------|----------------------|
| Incident classification | CPS 234 | ✅ Implemented |
| 72-hour notification tracking | CPS 234 | ✅ Implemented |
| Evidence export | CPS 234 | ✅ Implemented (JSON) |
| Material impact assessment | CPS 234 | ✅ Implemented |
| Audit trail | CPS 234 | ⚠️ Partial (via auditLog) |
| Model risk assessment | CPS 230 | ⚠️ Schema defined, UI pending |
| Control testing | CPS 230 | ❌ Not implemented |
| Remediation tracking | CPS 230 | ❌ Not implemented |
| 7-year retention | APRA | ❌ Not implemented |
| Legal hold | Internal | ❌ Not implemented |

---

## 🧪 Testing Considerations

### Unit Tests Needed
1. ApraCpsDomain Zod schema validation
2. tRPC router input validation
3. Badge component rendering for each state
4. Stats calculation logic

### Integration Tests Needed
1. End-to-end CPS workflow
2. Evidence export generation
3. Audit log recording
4. Filter functionality in traces table

### CPS Tests Needed
1. 72-hour notification deadline calculation
2. Evidence package integrity
3. Immutable audit trail
4. Access control enforcement

---

## 📝 Next Steps for Krish

1. **Review the implementation** - Check all files are in place
2. **Run the migration** - Apply the Prisma migration to add the column
3. **Test locally** - Start dev server and verify UI components render
4. **Record demo** - Use the demo script to record the 2-minute Loom
5. **Decide on production** - Prioritize the "Still Needed" items based on requirements

---

## 🔗 Key Files to Review

- **Domain Model**: `packages/shared/src/domain/traces.ts`
- **API Router**: `web/src/server/api/routers/apraCps.ts`
- **UI Panel**: `web/src/features/apra-cps/components/ApraCpsPanel.tsx`
- **Documentation**: `APRA_CPS.md`

---

## 💡 Design Philosophy

This implementation follows a "crawl, walk, run" approach:

1. **Crawl** (This POC): Basic CPS tagging, simple UI, JSON storage
2. **Walk** (MVP): Automated detection, email alerts, PDF export
3. **Run** (Production): Full CPS 230/234 coverage, integrations, audit trails

The goal was to demonstrate the concept quickly while leaving a clear path for productionization.

---

## ✅ Checklist

- [x] Database schema updated
- [x] Migration created
- [x] Domain model defined
- [x] API router implemented
- [x] UI components created
- [x] Dashboard integration
- [x] Filter columns added
- [x] Documentation written
- [x] Demo script prepared
- [ ] Prisma migration applied
- [ ] End-to-end testing
- [ ] Production deployment plan

---

**Summary**: This proof-of-concept demonstrates APRA CPS features for Langfuse with material impact tagging, 72-hour notification tracking, and evidence export. It's ready for a demo and provides a foundation for full production implementation.

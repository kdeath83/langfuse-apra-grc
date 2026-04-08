# APRA CPS Feature for Langfuse

## Overview

This feature adds Australian Prudential Regulation Authority (APRA) CPS (Prudential Standards) compliance capabilities to Langfuse, specifically targeting:
- **CPS 234** - Prudential Standard for Information Security (incident notification)
- **CPS 230** - Operational Risk Management (model risk assessment)

## Implemented Features

### 1. Material Impact Threshold Tagging (72-Hour Notification Rule)

Traces can be marked with APRA CPS metadata:
- **Material Impact Flag**: Indicates if the trace represents a material incident
- **CPS 234 Classification**: LOW, MEDIUM, HIGH, CRITICAL impact levels
- **Impact Type**: OPERATIONAL, FINANCIAL, REPUTATIONAL, REGULATORY, CUSTOMER_HARM, OTHER
- **Notification Tracking**: Records when APRA was notified and reference numbers

### 2. Dashboard Components

- **ApraCpsBadge**: Visual indicator of CPS status
- **ApraCpsPanel**: Full assessment interface on trace detail pages
- **ApraCpsStats**: Project-wide CPS overview widget

### 3. Evidence Export (CPS 234)

Export trace data for compliance evidence packages:
- JSON export format
- Includes CPS metadata, timestamps, and trace details
- Records evidence export history

## Files Changed/Created

### Database
- `packages/shared/prisma/migrations/20260408120000_add_apra_cps/migration.sql` - Adds apra_cps JSON column

### Domain Model
- `packages/shared/src/domain/traces.ts` - Added ApraCpsDomain schema
- `packages/shared/src/tableDefinitions/tracesTable.ts` - Added APRA CPS columns

### API (tRPC)
- `web/src/server/api/routers/apraCps.ts` - New router with:
  - `getByTraceId` - Fetch CPS status
  - `update` - Update CPS metadata
  - `batchMarkMaterialImpact` - Bulk marking
  - `markNotified` - Record APRA notification
  - `exportEvidence` - Export evidence package
  - `getStats` - Project CPS statistics
- `web/src/server/api/root.ts` - Added apraCps router

### UI Components
- `web/src/features/apra-cps/components/ApraCpsBadge.tsx` - Status badges
- `web/src/features/apra-cps/components/ApraCpsPanel.tsx` - Assessment panel
- `web/src/features/apra-cps/components/ApraCpsStats.tsx` - Stats widget
- `web/src/features/apra-cps/index.ts` - Component exports

## Usage

### Viewing CPS Status

CPS badges appear on trace detail pages:
- **Not Assessed** - Gray badge
- **Compliant** - Green badge
- **Material Impact** - Red badge with alert icon
- **72h Notification Required** - Pulsing red badge (urgent)
- **APRA Notified** - Green badge with checkmark
- **Evidence Exported** - Blue badge

### Assessing CPS

1. Open a trace detail page
2. Locate the "APRA CPS" panel
3. Click "Assess CPS" or "Edit Assessment"
4. Select:
   - Impact Type (Operational, Financial, etc.)
   - CPS 234 Classification (Low, Medium, High, Critical)
5. Add assessment notes
6. Click "Mark Material Impact" or "Mark Compliant"

### Recording APRA Notification

For HIGH or CRITICAL classifications:
1. The panel will show a "72-Hour Notification Required" alert
2. Enter the notification reference (optional)
3. Click "Mark APRA Notified"
4. The system records the timestamp and reference

### Exporting Evidence

1. Open a trace with material impact
2. Click "Export Evidence" in the CPS panel
3. The system generates an evidence package with:
   - Trace metadata
   - CPS records
   - Assessment notes
   - Export audit trail

### Filtering by CPS Status

New filter columns available in the traces table:
- **APRA CPS** - Filter by status
- **Material Impact** - Boolean filter
- **CPS 234 Level** - Filter by classification

## Demo Script (2-Minute Loom Video)

### Introduction (0:00-0:15)
"Today I'm demonstrating APRA CPS features for Langfuse, specifically for Australian financial services. We've added support for CPS 234 incident notification and CPS 230 model risk assessment."

### Feature 1: Material Impact Tagging (0:15-0:45)
1. Navigate to a trace in the project
2. Scroll to the APRA CPS panel
3. Click "Assess CPS"
4. Select impact type: "Operational Risk"
5. Select classification: "High Impact"
6. Add notes: "Potential data exposure incident"
7. Click "Mark Material Impact"
8. Show the red "Material Impact" badge appearing

### Feature 2: 72-Hour Notification Rule (0:45-1:15)
1. Show the alert banner: "72-Hour Notification Required"
2. Explain: "APRA requires notification within 72 hours for high/critical incidents"
3. Enter notification reference: "APRA-2024-00123"
4. Click "Mark APRA Notified"
5. Show the badge changing to green "APRA Notified"
6. Show the notification date recorded

### Feature 3: Evidence Export (1:15-1:45)
1. Click "Export Evidence" button
2. Show toast: "Evidence Package Exported"
3. Show export ID
4. Navigate to traces list
5. Show the CPS filter columns
6. Filter by "Material Impact" = true

### Feature 4: Dashboard Stats (1:45-2:00)
1. Navigate to project dashboard
2. Show APRA CPS Overview widget
3. Point out:
   - Total traces assessed
   - Material impact count
   - Pending notifications (action required)
   - APRA notified count
   - CPS 234 classification breakdown

## What's Still Needed for Production

### Backend
1. **Clickhouse Integration**: Move CPS data to Clickhouse for analytics queries
2. **Background Jobs**: Automated material impact detection based on rules
3. **Email Notifications**: Alert CPS officers of pending notifications
4. **Audit Logging**: Full audit trail for all CPS changes
5. **API Endpoints**: Public API for external CPS tools

### Frontend
1. **Bulk Actions**: Multi-select traces for batch CPS marking
2. **CPS Reports**: PDF report generation
3. **Timeline View**: Visual timeline of incident response
4. **Integration Cards**: Connect to APRA portal APIs

### Data
1. **Model Risk Assessment**: CPS 230 specific fields for model governance
2. **Control Testing**: Record control effectiveness assessments
3. **Remediation Tracking**: Track remediation actions and deadlines

### CPS
1. **Data Retention**: 7-year retention policy for CPS records
2. **Access Controls**: Role-based access for CPS data
3. **Immutable Records**: Tamper-evident CPS logs
4. **Legal Hold**: Prevent deletion of traces under investigation

## Architecture Notes

This proof-of-concept stores APRA CPS metadata as JSON in the PostgreSQL traces table. For production:
- Move to Clickhouse for high-volume analytics
- Consider dedicated CPS table for complex queries
- Implement proper indexing for filter performance
- Add validation at database level

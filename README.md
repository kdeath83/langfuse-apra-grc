# Langfuse APRA GRC — AI Observability for Australian Financial Services

⚠️ **PROTOTYPE — FOR DEMONSTRATION PURPOSES ONLY**

Built by [Krish De](https://linkedin.com/in/krishde) — ex APRA, co-author of CPS230/CPS234 & AWS Principal GRC


This is a proof-of-concept fork exploring the extrapolation of AI observability from a subset of APRA prudential expectations. 
It is **NOT production-ready** and should not be used in actual financial services environments without significant additional development, security review, and compliance validation.


## What This Is

A fork of [Langfuse](https://langfuse.com) that adds **GRC features** for AI observability within Australian banks and insurers.

**The Problem:** AI systems make decisions affecting customers and compliance, but teams have black-box systems that can't explain *why* decisions were made to regulators.

**The Solution:** CloudTrail for your AI agents — with compliance built in, not bolted on.

## Features

### 1. Material Impact Tagging (CPS 234, Paragraph 36-37 72-Hour Notification Rule)
- Flag traces by CPS 234 classification: LOW / MEDIUM / HIGH / CRITICAL
- Automatic 72-hour notification tracking
- Audit trail with timestamps and assessor identity

### 2. Compliance Dashboard
- Stats widget: total traces, assessed, material impact, pending notifications
- Filter traces by compliance status
- Evidence export for CPS 234 investigations

### 3. APRA Notification Workflow
- Alert banner for material impact traces
- One-click APRA notification recording
- Reference number tracking

## Who This Is For

- Risk teams at Australian APRA regulated industries
- Compliance officers navigating CPS 230/234
- AI governance leads who need explainability, not just logging

## Security & Performance (Conceptual)

This prototype explores these security concepts:
- 🔄 Atomic transactions for concurrent updates
- 🔄 Row-level locking for audit integrity
- 🔄 Batch operation limits (N+1 addressed)
- 🔄 Sensitive data considerations for exports
- 🔄 Database indexing strategies

**Note:** These are implemented as learning exercises. A production system would require formal security audit, penetration testing, and compliance validation.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/kdeath83/langfuse-apra-grc.git
cd langfuse-apra-grc

# 2. Install
pnpm install --ignore-scripts

# 3. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Run migrations
cd packages/shared
pnpm prisma migrate dev

# 5. Start dev server
cd ../../web
pnpm dev
```

## Why I Built This

Most "AI governance" tools are liability theater. They teach you just enough to sound informed in a meeting, not enough to build anything that works.
This is the opposite: working code that demonstrates the gap between *knowing* about AI GRC and *building* for it.

## Architecture

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, tRPC
- **Backend:** PostgreSQL with JSON fields for compliance metadata
- **Observability:** OpenTelemetry-compatible tracing
- **Compliance:** CPS 230/234-native data model

## Regulatory Mapping (Conceptual)

This prototype explores compliance with the following APRA prudential standards:

### CPS 234 — Information Security

**Paragraph 36-37: Information Security Incident Management**
- 72-hour notification requirement for material incidents
- This prototype's "Material Impact Tagging" and notification workflow demonstrate tracking this obligation

**Paragraph 39: Testing and Assurance**
- Requirement for systematic testing of security controls
- The audit trail features demonstrate how AI system decisions could be tested and validated

**Paragraph 45-46: Security Controls for Information Assets**
- Controls commensurate with criticality and sensitivity
- The CPS 234 classification levels (LOW/MEDIUM/HIGH/CRITICAL) map directly to this requirement

### CPS 230 — Operational Risk Management

**Paragraph 14-15: Operational Risk Management Framework**
- Requirement to identify, assess, and manage operational risks
- The compliance dashboard demonstrates risk visibility for AI systems

**Paragraph 23-24: Risk Assessment and Monitoring**
- Continuous monitoring and assessment of operational risks
- The stats widget and filtering capabilities demonstrate this concept

**Paragraph 39-40: Third-Party Risk Management**
- Management of risks from service providers (relevant for AI/ML platforms)
- The evidence export feature demonstrates how third-party AI system decisions could be documented

**Disclaimer:** These mappings are illustrative only. APRA-regulated entities must conduct their own compliance assessments and obtain appropriate legal and compliance advice before implementing any system based on this prototype.

## Key Files

- `web/src/server/api/routers/apraGrc.ts` — Main compliance API
- `web/src/features/apra-grc/` — UI components
- `packages/shared/prisma/schema.prisma` — Database schema

## License

MIT (same as Langfuse)

## Credits

- Original [Langfuse](https://langfuse.com) by Langfuse Authors
- APRA GRC extensions by Krish De
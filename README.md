# Langfuse APRA CPS — AI Observability for Australian Financial Services

Built by [Krish De](https://linkedin.com/in/krishde) — 8 years at AWS, co-author of CPS230/CPS234.

## What This Is

A fork of [Langfuse](https://langfuse.com) that adds **APRA-native compliance features** for AI observability in Australian banks and insurers.

**The Problem:** AI systems make decisions affecting customers and compliance, but teams have black-box systems that can't explain *why* decisions were made to regulators.

**The Solution:** CloudTrail for your AI agents — with compliance built in, not bolted on.

## Features

### 1. Material Impact Tagging (CPS 234 72-Hour Rule)
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

- Risk teams at Australian banks
- Compliance officers navigating CPS 230/234
- AI governance leads who need explainability, not just logging

## Security & Performance

This fork includes production-ready fixes:
- ✅ Atomic transactions for concurrent updates
- ✅ Row-level locking for audit integrity
- ✅ Batch operation limits (N+1 eliminated)
- ✅ Sensitive data redaction in exports
- ✅ Database indexes for common queries

## Quick Start

```bash
# 1. Clone
git clone https://github.com/kdeath83/langfuse-apra-cps.git
cd langfuse-apra-cps

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

I spent 8 years at AWS helping banks deploy AI. Before that, I co-wrote the regulations (CPS230, CPS234) that tell those banks how to prove their AI is safe. I've sat on both sides.

The certification industrial complex is booming, but most "AI governance" tools are liability theater. They teach you just enough to sound informed in a meeting, not enough to build anything that works.

This is the opposite: working code that demonstrates competence.

## Architecture

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, tRPC
- **Backend:** PostgreSQL with JSON fields for compliance metadata
- **Observability:** OpenTelemetry-compatible tracing
- **Compliance:** CPS 230/234-native data model

## Key Files

- `web/src/server/api/routers/apraCps.ts` — Main compliance API
- `web/src/features/apra-cps/` — UI components
- `packages/shared/prisma/schema.prisma` — Database schema

## License

MIT (same as Langfuse)

## Credits

- Original [Langfuse](https://langfuse.com) by Langfuse Authors
- APRA CPS extensions by Krish De
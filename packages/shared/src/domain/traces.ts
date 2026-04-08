import z from "zod";
import { jsonSchema, jsonSchemaNullable } from "../utils/zod";

export const MetadataDomain = z.record(
  z.string(),
  jsonSchemaNullable.or(z.undefined()),
);

export type MetadataDomain = z.infer<typeof MetadataDomain>;

// APRA GRC Schema
export const ApraGrcDomain = z.object({
  // Material impact threshold triggered (for 72-hour notification rule)
  materialImpact: z.boolean().default(false),
  // Type of material impact
  impactType: z.enum([
    "OPERATIONAL",      // CPS 234 - Information Security
    "FINANCIAL",        // Financial loss threshold
    "REPUTATIONAL",     // Reputational damage
    "REGULATORY",       // Regulatory breach
    "CUSTOMER_HARM",    // Customer data/impact
    "OTHER"
  ]).nullable().optional(),
  // Has APRA been notified (72-hour rule compliance)
  notifiedApra: z.boolean().default(false),
  // When APRA was notified
  notifiedAt: z.date().nullable().optional(),
  // Reference number for APRA notification
  notificationRef: z.string().nullable().optional(),
  // CPS 234 incident classification
  cps234Classification: z.enum([
    "LOW",      // Low impact
    "MEDIUM",   // Medium impact  
    "HIGH",     // High impact (notify within 72 hours)
    "CRITICAL"  // Critical impact (immediate notification)
  ]).nullable().optional(),
  // Model risk assessment for CPS 230
  modelRiskAssessed: z.boolean().default(false),
  // Assessment details
  assessmentNotes: z.string().nullable().optional(),
  // Who marked this as compliant/non-compliant
  assessedBy: z.string().nullable().optional(),
  // When the compliance status was set
  assessedAt: z.date().nullable().optional(),
  // Evidence package exported
  evidenceExported: z.boolean().default(false),
  // When evidence was exported
  evidenceExportedAt: z.date().nullable().optional(),
});

export type ApraGrcDomain = z.infer<typeof ApraGrcDomain>;

// to be used across the application in frontend and backend.
export const TraceDomain = z.object({
  id: z.string(),
  name: z.string().nullable(),
  timestamp: z.date(),
  environment: z.string(),
  tags: z.array(z.string()),
  bookmarked: z.boolean(),
  public: z.boolean(),
  release: z.string().nullable(),
  version: z.string().nullable(),
  input: jsonSchema.nullable(),
  output: jsonSchema.nullable(),
  metadata: MetadataDomain,
  createdAt: z.date(),
  updatedAt: z.date(),
  sessionId: z.string().nullable(),
  userId: z.string().nullable(),
  projectId: z.string(),
  // APRA GRC metadata
  apraGrc: ApraGrcDomain.nullable().optional(),
});

export type TraceDomain = z.infer<typeof TraceDomain>;

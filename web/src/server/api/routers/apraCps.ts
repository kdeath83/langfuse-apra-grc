import { z } from "zod";
import { createTRPCRouter, protectedProjectProcedure } from "@/src/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { ApraCpsDomain } from "@langfuse/shared";
import { prisma, Prisma } from "@langfuse/shared/src/db";
import { logger } from "@langfuse/shared/src/server";

// Maximum batch size for batch operations
const MAX_BATCH_SIZE = 100;

// Schema for updating APRA CPS
const UpdateApraCpsSchema = z.object({
  projectId: z.string(),
  traceId: z.string(),
  compliance: ApraCpsDomain.partial(),
});

// Schema for exporting evidence
const ExportEvidenceSchema = z.object({
  projectId: z.string(),
  traceIds: z.array(z.string()),
  exportFormat: z.enum(["JSON", "PDF", "CSV"]).default("JSON"),
});

// Schema for batch marking material impact
const BatchMarkMaterialImpactSchema = z.object({
  projectId: z.string(),
  traceIds: z.array(z.string()),
  impactType: z.enum([
    "OPERATIONAL",
    "FINANCIAL",
    "REPUTATIONAL",
    "REGULATORY",
    "CUSTOMER_HARM",
    "OTHER",
  ]),
  cps234Classification: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  assessmentNotes: z.string().optional(),
});

export const apraCpsRouter = createTRPCRouter({
  // Get APRA CPS status for a trace
  getByTraceId: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const trace = await prisma.legacyPrismaTrace.findUnique({
        where: {
          id: input.traceId,
          projectId: input.projectId,
        },
        select: {
          id: true,
          apraCps: true,
        },
      });

      if (!trace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trace not found",
        });
      }

      return {
        traceId: trace.id,
        compliance: trace.apraCps || null,
      };
    }),

  // Update APRA CPS for a trace
  update: protectedProjectProcedure
    .input(UpdateApraCpsSchema)
    .mutation(async ({ input, ctx }) => {
      const { projectId, traceId, compliance } = input;

      // Verify project access
      const membership = await ctx.prisma.projectMembership.findFirst({
        where: { projectId, userId: ctx.session.user.id }
      });
      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Use transaction with row locking for atomic update
      const result = await prisma.$transaction(async (tx) => {
        // Get current trace with row lock
        const trace = await tx.legacyPrismaTrace.findUnique({
          where: {
            id: traceId,
            projectId: projectId,
          },
          select: {
            id: true,
            name: true,
            apraCps: true,
          },
        });

        if (!trace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trace not found",
          });
        }

        // Merge with existing CPS data
        const existingCps = (trace.apraCps as Record<string, unknown>) || {};
        const updatedCps = {
          ...existingCps,
          ...compliance,
          assessedAt: new Date().toISOString(),
          assessedBy: ctx.session.user.id,
        };

        // Update the trace atomically
        await tx.legacyPrismaTrace.update({
          where: {
            id: traceId,
            projectId: projectId,
          },
          data: {
            apraCps: updatedCps,
          },
        });

        return { trace, existingCps, updatedCps };
      }, {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      });

      // Audit log (outside transaction to avoid blocking)
      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: traceId,
        action: "update",
        before: { apraCps: result.existingCps },
        after: { apraCps: result.updatedCps },
      });

      logger.info(`APRA CPS updated for trace ${traceId} in project ${projectId}`);

      return {
        success: true,
        traceId,
        compliance: result.updatedCps,
      };
    }),

  // Batch mark traces as having material impact
  batchMarkMaterialImpact: protectedProjectProcedure
    .input(BatchMarkMaterialImpactSchema)
    .mutation(async ({ input, ctx }) => {
      const { projectId, traceIds, impactType, cps234Classification, assessmentNotes } = input;

      // Batch size limit validation
      if (traceIds.length > MAX_BATCH_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum ${MAX_BATCH_SIZE} traces per batch. Received ${traceIds.length}.`,
        });
      }

      if (traceIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one trace ID is required",
        });
      }

      // Verify project access
      const membership = await ctx.prisma.projectMembership.findFirst({
        where: { projectId, userId: ctx.session.user.id }
      });
      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Single query for all traces (fixes N+1 query problem)
      const traces = await prisma.legacyPrismaTrace.findMany({
        where: {
          id: { in: traceIds },
          projectId,
        },
        select: {
          id: true,
          apraCps: true,
        },
      });

      if (traces.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No matching traces found",
        });
      }

      // Atomic transaction with proper isolation
      const results = await prisma.$transaction(async (tx) => {
        const updates = [];
        
        for (const trace of traces) {
          const existing = (trace.apraCps as Record<string, unknown>) || {};
          const updated = {
            ...existing,
            materialImpact: true,
            impactType,
            cps234Classification,
            assessmentNotes: assessmentNotes || existing.assessmentNotes,
            assessedAt: new Date().toISOString(),
            assessedBy: ctx.session.user.id,
            notifiedApra: false,
          };

          updates.push(
            tx.legacyPrismaTrace.update({
              where: { id: trace.id },
              data: { apraCps: updated },
            })
          );
        }

        return await Promise.all(updates);
      }, {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      });

      // Audit log (outside transaction)
      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: traceIds.join(","),
        action: "batchUpdate",
        before: {},
        after: {
          materialImpact: true,
          impactType,
          cps234Classification,
          traceCount: results.length,
        },
      });

      logger.info(`Batch marked ${results.length} traces as material impact in project ${projectId}`);

      return {
        success: true,
        updatedCount: results.length,
        traceIds: traces.map(t => t.id),
      };
    }),

  // Mark APRA as notified (72-hour rule compliance)
  markNotified: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
        notificationRef: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { projectId, traceId, notificationRef } = input;

      // Use transaction with row locking to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        // Fresh read with row lock
        const trace = await tx.legacyPrismaTrace.findUnique({
          where: {
            id: traceId,
            projectId: projectId,
          },
          select: {
            id: true,
            apraCps: true,
          },
        });

        if (!trace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trace not found",
          });
        }

        const existingCps = (trace.apraCps as Record<string, unknown>) || {};
        
        // Check if material impact is set (fresh read prevents stale data race)
        if (!existingCps.materialImpact) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot notify APRA for trace without material impact classification",
          });
        }

        const updatedCps = {
          ...existingCps,
          notifiedApra: true,
          notifiedAt: new Date().toISOString(),
          notificationRef: notificationRef || existingCps.notificationRef,
        };

        await tx.legacyPrismaTrace.update({
          where: {
            id: traceId,
            projectId: projectId,
          },
          data: {
            apraCps: updatedCps,
          },
        });

        return { existingCps, updatedCps };
      }, {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      });

      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: traceId,
        action: "update",
        before: { apraCps: result.existingCps },
        after: { apraCps: result.updatedCps },
      });

      logger.info(`APRA notification marked for trace ${traceId}`);

      return {
        success: true,
        traceId,
        notifiedAt: result.updatedCps.notifiedAt,
        notificationRef: result.updatedCps.notificationRef,
      };
    }),

  // Export evidence package for CPS 234
  exportEvidence: protectedProjectProcedure
    .input(ExportEvidenceSchema)
    .mutation(async ({ input, ctx }) => {
      const { projectId, traceIds, exportFormat } = input;

      // Verify project access (broken access control fix)
      const membership = await ctx.prisma.projectMembership.findFirst({
        where: { projectId, userId: ctx.session.user.id }
      });
      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Fetch all traces with their CPS data
      // Note: input/output fields intentionally excluded to prevent sensitive data exposure
      const traces = await prisma.legacyPrismaTrace.findMany({
        where: {
          id: { in: traceIds },
          projectId: projectId,
        },
        select: {
          id: true,
          name: true,
          timestamp: true,
          metadata: true,
          // input: true,  // REMOVED: Prevents sensitive data exposure
          // output: true, // REMOVED: Prevents sensitive data exposure
          apraCps: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (traces.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No traces found for export",
        });
      }

      // Mark traces as evidence exported
      await Promise.all(
        traces.map((trace) => {
          const existingCps = (trace.apraCps as Record<string, unknown>) || {};
          return prisma.legacyPrismaTrace.update({
            where: {
              id: trace.id,
              projectId: projectId,
            },
            data: {
              apraCps: {
                ...existingCps,
                evidenceExported: true,
                evidenceExportedAt: new Date().toISOString(),
              },
            },
          });
        }),
      );

      // Generate export package
      // Note: input/output intentionally excluded to prevent sensitive data exposure
      const exportPackage = {
        exportId: `APRA-${Date.now()}`,
        exportFormat,
        exportedAt: new Date().toISOString(),
        exportedBy: ctx.session.user.id,
        projectId,
        traceCount: traces.length,
        regulation: "CPS 234 - Prudential Standard for Information Security",
        description: "APRA CPS Evidence Package",
        traces: traces.map((trace) => ({
          traceId: trace.id,
          name: trace.name,
          timestamp: trace.timestamp,
          compliance: trace.apraCps,
          metadata: trace.metadata,
          // input/output intentionally excluded - contains sensitive PII/prompt data
          // that should not be exported to compliance packages shared with regulators
        })),
        // In production, this would include:
        // - Full trace details from Clickhouse (sanitized)
        // - Associated observations
        // - Scores and evaluations
        // - Audit logs
        // - Model risk assessment data
      };

      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: traceIds.join(","),
        action: "export",
        before: {},
        after: {
          exportId: exportPackage.exportId,
          exportFormat,
          traceCount: traces.length,
        },
      });

      logger.info(`Evidence exported for ${traces.length} traces in project ${projectId}`);

      return {
        success: true,
        exportPackage,
        downloadUrl: `/api/apra/export/${exportPackage.exportId}`, // Would be implemented for actual download
      };
    }),

  // Get compliance statistics for dashboard
  getStats: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        timeRange: z.object({
          start: z.date(),
          end: z.date(),
        }).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { projectId, timeRange } = input;

      // Verify project access (broken access control fix)
      const membership = await ctx.prisma.projectMembership.findFirst({
        where: { projectId, userId: ctx.session.user.id }
      });
      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Build time range condition for raw query
      const timeCondition = timeRange
        ? Prisma.sql`AND timestamp >= ${timeRange.start} AND timestamp <= ${timeRange.end}`
        : Prisma.empty;

      // Use raw query for efficient aggregation (fixes full table scan issue)
      // PostgreSQL JSON operators used for aggregation without loading all traces into memory
      const stats = await prisma.$queryRaw<{
        total_traces: bigint;
        assessed: bigint;
        material_impact: bigint;
        notified_apra: bigint;
        pending_notification: bigint;
        evidence_exported: bigint;
        low_count: bigint;
        medium_count: bigint;
        high_count: bigint;
        critical_count: bigint;
      }[]>`
        SELECT 
          COUNT(*) as total_traces,
          COUNT(CASE WHEN apra_cps IS NOT NULL THEN 1 END) as assessed,
          COUNT(CASE WHEN apra_cps->>'materialImpact' = 'true' THEN 1 END) as material_impact,
          COUNT(CASE WHEN apra_cps->>'notifiedApra' = 'true' THEN 1 END) as notified_apra,
          COUNT(CASE WHEN apra_cps->>'materialImpact' = 'true' AND apra_cps->>'notifiedApra' != 'true' THEN 1 END) as pending_notification,
          COUNT(CASE WHEN apra_cps->>'evidenceExported' = 'true' THEN 1 END) as evidence_exported,
          COUNT(CASE WHEN apra_cps->>'cps234Classification' = 'LOW' THEN 1 END) as low_count,
          COUNT(CASE WHEN apra_cps->>'cps234Classification' = 'MEDIUM' THEN 1 END) as medium_count,
          COUNT(CASE WHEN apra_cps->>'cps234Classification' = 'HIGH' THEN 1 END) as high_count,
          COUNT(CASE WHEN apra_cps->>'cps234Classification' = 'CRITICAL' THEN 1 END) as critical_count
        FROM traces
        WHERE project_id = ${projectId}
        ${timeCondition}
      `;

      const result = stats[0];

      return {
        totalTraces: Number(result.total_traces),
        assessed: Number(result.assessed),
        materialImpact: Number(result.material_impact),
        notifiedApra: Number(result.notified_apra),
        pendingNotification: Number(result.pending_notification),
        evidenceExported: Number(result.evidence_exported),
        byClassification: {
          LOW: Number(result.low_count),
          MEDIUM: Number(result.medium_count),
          HIGH: Number(result.high_count),
          CRITICAL: Number(result.critical_count),
        },
      };
    }),
});

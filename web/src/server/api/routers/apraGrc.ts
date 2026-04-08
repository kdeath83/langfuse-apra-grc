import { Prisma } from "@langfuse/shared";
import { z } from "zod";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  type ApraGrcDomain,
  ApraGrcDomain as ApraGrcSchema,
} from "@langfuse/shared";

const ApraGrcInput = ApraGrcSchema.partial();

const getTraceApraGrc = async ({
  prisma,
  projectId,
  traceId,
}: {
  prisma: any;
  projectId: string;
  traceId: string;
}) => {
  const rows = await prisma.$queryRaw<Array<{ id: string; apra_grc: unknown }>>(
    Prisma.sql`
      SELECT id, apra_grc
      FROM traces
      WHERE id = ${traceId} AND project_id = ${projectId}
      LIMIT 1
    `,
  );

  const row = rows[0];
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Trace not found" });
  }

  return row.apra_grc as ApraGrcDomain | null;
};

const normalizeForStorage = (input: Partial<ApraGrcDomain>) => {
  const json = {
    ...input,
    notifiedAt: input.notifiedAt
      ? new Date(input.notifiedAt).toISOString()
      : input.notifiedAt,
    assessedAt: input.assessedAt
      ? new Date(input.assessedAt).toISOString()
      : input.assessedAt,
    evidenceExportedAt: input.evidenceExportedAt
      ? new Date(input.evidenceExportedAt).toISOString()
      : input.evidenceExportedAt,
  };

  return JSON.stringify(json);
};

export const apraGrcRouter = createTRPCRouter({
  getByTraceId: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const compliance = await getTraceApraGrc({
        prisma: ctx.prisma,
        projectId: input.projectId,
        traceId: input.traceId,
      });

      return { compliance };
    }),

  getStats: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.prisma.$queryRaw<
        Array<{
          total_traces: bigint | number;
          assessed: bigint | number;
          material_impact: bigint | number;
          pending_notification: bigint | number;
          notified_apra: bigint | number;
          evidence_exported: bigint | number;
          low_count: bigint | number;
          medium_count: bigint | number;
          high_count: bigint | number;
          critical_count: bigint | number;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(*) AS total_traces,
          COUNT(*) FILTER (WHERE apra_grc IS NOT NULL) AS assessed,
          COUNT(*) FILTER (
            WHERE COALESCE(apra_grc->>'materialImpact', 'false') = 'true'
          ) AS material_impact,
          COUNT(*) FILTER (
            WHERE COALESCE(apra_grc->>'materialImpact', 'false') = 'true'
              AND COALESCE(apra_grc->>'cps234Classification', '') IN ('HIGH', 'CRITICAL')
              AND COALESCE(apra_grc->>'notifiedApra', 'false') != 'true'
          ) AS pending_notification,
          COUNT(*) FILTER (
            WHERE COALESCE(apra_grc->>'notifiedApra', 'false') = 'true'
          ) AS notified_apra,
          COUNT(*) FILTER (
            WHERE COALESCE(apra_grc->>'evidenceExported', 'false') = 'true'
          ) AS evidence_exported,
          COUNT(*) FILTER (WHERE apra_grc->>'cps234Classification' = 'LOW') AS low_count,
          COUNT(*) FILTER (WHERE apra_grc->>'cps234Classification' = 'MEDIUM') AS medium_count,
          COUNT(*) FILTER (WHERE apra_grc->>'cps234Classification' = 'HIGH') AS high_count,
          COUNT(*) FILTER (WHERE apra_grc->>'cps234Classification' = 'CRITICAL') AS critical_count
        FROM traces
        WHERE project_id = ${input.projectId}
      `);

      const row = rows[0];
      const toNumber = (value: bigint | number | undefined) =>
        Number(value ?? 0);

      return {
        totalTraces: toNumber(row?.total_traces),
        assessed: toNumber(row?.assessed),
        materialImpact: toNumber(row?.material_impact),
        pendingNotification: toNumber(row?.pending_notification),
        notifiedApra: toNumber(row?.notified_apra),
        evidenceExported: toNumber(row?.evidence_exported),
        byClassification: {
          LOW: toNumber(row?.low_count),
          MEDIUM: toNumber(row?.medium_count),
          HIGH: toNumber(row?.high_count),
          CRITICAL: toNumber(row?.critical_count),
        },
      };
    }),

  update: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
        compliance: ApraGrcInput,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const before = await getTraceApraGrc({
        prisma: ctx.prisma,
        projectId: input.projectId,
        traceId: input.traceId,
      });

      const patch: Partial<ApraGrcDomain> = {
        ...input.compliance,
        assessedAt: new Date(),
        assessedBy: ctx.session.user.email ?? ctx.session.user.id,
      };

      const rows = await ctx.prisma.$queryRaw<Array<{ apra_grc: unknown }>>(
        Prisma.sql`
          UPDATE traces
          SET
            apra_grc = COALESCE(apra_grc, '{}'::jsonb) || ${normalizeForStorage(patch)}::jsonb,
            updated_at = NOW()
          WHERE id = ${input.traceId} AND project_id = ${input.projectId}
          RETURNING apra_grc
        `,
      );

      const compliance = (rows[0]?.apra_grc ?? null) as ApraGrcDomain | null;

      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: input.traceId,
        action: "apra-grc.update",
        before,
        after: compliance,
      });

      return { compliance };
    }),

  markNotified: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceId: z.string(),
        notificationRef: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const before = await getTraceApraGrc({
        prisma: ctx.prisma,
        projectId: input.projectId,
        traceId: input.traceId,
      });

      const patch: Partial<ApraGrcDomain> = {
        notifiedApra: true,
        notifiedAt: new Date(),
        notificationRef: input.notificationRef,
        assessedAt: new Date(),
        assessedBy: ctx.session.user.email ?? ctx.session.user.id,
      };

      await ctx.prisma.$queryRaw(
        Prisma.sql`
          UPDATE traces
          SET
            apra_grc = COALESCE(apra_grc, '{}'::jsonb) || ${normalizeForStorage(patch)}::jsonb,
            updated_at = NOW()
          WHERE id = ${input.traceId} AND project_id = ${input.projectId}
        `,
      );

      const after = await getTraceApraGrc({
        prisma: ctx.prisma,
        projectId: input.projectId,
        traceId: input.traceId,
      });

      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: input.traceId,
        action: "apra-grc.mark-notified",
        before,
        after,
      });

      return {
        success: true,
        notificationRef: input.notificationRef,
      };
    }),

  exportEvidence: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        traceIds: z.array(z.string()).min(1),
        exportFormat: z.enum(["JSON", "CSV"]).default("JSON"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const exportId = `APRA-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      const exportedAt = new Date();
      const traceIds = Prisma.join(input.traceIds);

      await ctx.prisma.$queryRaw(
        Prisma.sql`
          UPDATE traces
          SET
            apra_grc = COALESCE(apra_grc, '{}'::jsonb) || ${normalizeForStorage(
              {
                evidenceExported: true,
                evidenceExportedAt: exportedAt,
              },
            )}::jsonb,
            updated_at = NOW()
          WHERE project_id = ${input.projectId}
            AND id IN (${traceIds})
        `,
      );

      await auditLog({
        session: ctx.session,
        resourceType: "trace",
        resourceId: input.traceIds[0] ?? exportId,
        action: "apra-grc.export-evidence",
        after: {
          exportId,
          traceIds: input.traceIds,
          exportFormat: input.exportFormat,
          exportedAt,
        },
      });

      return {
        exportPackage: {
          exportId,
          exportFormat: input.exportFormat,
          traceCount: input.traceIds.length,
          generatedAt: exportedAt,
        },
      };
    }),
});

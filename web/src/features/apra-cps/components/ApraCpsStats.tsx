import React from "react";
import { api } from "@/src/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, FileDown, Shield } from "lucide-react";

interface ApraCpsStatsProps {
  projectId: string;
}

export function ApraCpsStats({ projectId }: ApraCpsStatsProps) {
  const { data: stats, isLoading } = api.apraCps.getStats.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  if (isLoading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">APRA CPS Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4" />
          APRA CPS Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.totalTraces}</p>
            <p className="text-xs text-muted-foreground">Total Traces</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600">{stats.assessed}</p>
            <p className="text-xs text-muted-foreground">Assessed</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">{stats.materialImpact}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Material Impact
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-600">{stats.pendingNotification}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending 72h Notification
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{stats.notifiedApra}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              APRA Notified
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.evidenceExported}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileDown className="w-3 h-3" />
              Evidence Exported
            </p>
          </div>
        </div>

        {/* CPS 234 Classification Breakdown */}
        {stats.materialImpact > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">CPS 234 Impact Classification:</p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Low: {stats.byClassification.LOW}
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                Medium: {stats.byClassification.MEDIUM}
              </span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                High: {stats.byClassification.HIGH}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                Critical: {stats.byClassification.CRITICAL}
              </span>
            </div>
          </div>
        )}

        {stats.pendingNotification > 0 && (
          <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <strong>Action Required:</strong> {stats.pendingNotification} trace(s) require APRA notification within 72 hours.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

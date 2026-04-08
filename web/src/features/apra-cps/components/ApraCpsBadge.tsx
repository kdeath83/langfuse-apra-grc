import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Clock, FileDown } from "lucide-react";
import { type ApraCpsDomain } from "@langfuse/shared";

interface ApraCpsBadgeProps {
  compliance: ApraCpsDomain | null | undefined;
  showDetails?: boolean;
}

export function ApraCpsBadge({ compliance, showDetails = false }: ApraCpsBadgeProps) {
  if (!compliance) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Shield className="w-3 h-3 mr-1" />
        Not Assessed
      </Badge>
    );
  }

  const { materialImpact, notifiedApra, cps234Classification, evidenceExported } = compliance;

  // Critical/High classification requires 72-hour notification
  const needsNotification = materialImpact && 
    (cps234Classification === "HIGH" || cps234Classification === "CRITICAL") && 
    !notifiedApra;

  if (needsNotification) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        <AlertTriangle className="w-3 h-3 mr-1" />
        72h Notification Required
      </Badge>
    );
  }

  if (materialImpact && notifiedApra) {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        APRA Notified
        {showDetails && compliance.notificationRef && (
          <span className="ml-1 text-xs opacity-80">({compliance.notificationRef})</span>
        )}
      </Badge>
    );
  }

  if (materialImpact) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Material Impact
      </Badge>
    );
  }

  if (evidenceExported) {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-600">
        <FileDown className="w-3 h-3 mr-1" />
        Evidence Exported
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-green-600 border-green-600">
      <Shield className="w-3 h-3 mr-1" />
      Compliant
    </Badge>
  );
}

export function CPS234ClassificationBadge({ classification }: { classification?: string | null }) {
  if (!classification) return null;

  const variants: Record<string, { color: string; label: string }> = {
    LOW: { color: "bg-blue-100 text-blue-800", label: "Low Impact" },
    MEDIUM: { color: "bg-yellow-100 text-yellow-800", label: "Medium Impact" },
    HIGH: { color: "bg-orange-100 text-orange-800", label: "High Impact (72h)" },
    CRITICAL: { color: "bg-red-100 text-red-800", label: "Critical (Immediate)" },
  };

  const { color, label } = variants[classification] || { color: "bg-gray-100", label: classification };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {classification === "HIGH" || classification === "CRITICAL" ? (
        <Clock className="w-3 h-3 mr-1" />
      ) : null}
      {label}
    </span>
  );
}
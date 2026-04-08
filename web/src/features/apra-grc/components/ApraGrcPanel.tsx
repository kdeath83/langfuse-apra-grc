import React, { useState } from "react";
import { api } from "@/src/utils/api";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { ApraGrcBadge, CPS234ClassificationBadge } from "./ApraGrcBadge";
import { AlertTriangle, CheckCircle, Download, Shield } from "lucide-react";
import { useToast } from "@/src/components/ui/use-toast";
import { type ApraGrcDomain } from "@langfuse/shared";

interface ApraGrcPanelProps {
  projectId: string;
  traceId: string;
  initialCompliance?: ApraGrcDomain | null;
}

export function ApraGrcPanel({
  projectId,
  traceId,
  initialCompliance,
}: ApraGrcPanelProps) {
  const { toast } = useToast();
  const [compliance, setCompliance] = useState<ApraGrcDomain | null>(initialCompliance || null);
  const [isEditing, setIsEditing] = useState(false);
  const [notificationRef, setNotificationRef] = useState(compliance?.notificationRef || "");

  const updateMutation = api.apraGrc.update.useMutation({
    onSuccess: (data) => {
      setCompliance(data.compliance as ApraGrcDomain);
      setIsEditing(false);
      toast({
        title: "APRA GRC Updated",
        description: "The GRC status has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const notifyMutation = api.apraGrc.markNotified.useMutation({
    onSuccess: (data) => {
      toast({
        title: "APRA Notification Recorded",
        description: `Notification reference: ${data.notificationRef || "N/A"}`,
      });
      if (compliance) {
        setCompliance({
          ...compliance,
          notifiedApra: true,
          notifiedAt: new Date(),
          notificationRef: data.notificationRef || undefined,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = api.apraGrc.exportEvidence.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Evidence Package Exported",
        description: `Export ID: ${data.exportPackage.exportId}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkMaterialImpact = (values: {
    impactType: ApraGrcDomain["impactType"];
    cps234Classification: ApraGrcDomain["cps234Classification"];
    assessmentNotes?: string;
  }) => {
    updateMutation.mutate({
      projectId,
      traceId,
      compliance: {
        materialImpact: true,
        ...values,
      },
    });
  };

  const handleMarkCompliant = () => {
    updateMutation.mutate({
      projectId,
      traceId,
      compliance: {
        materialImpact: false,
        cps234Classification: null,
        impactType: null,
        notifiedApra: false,
        assessmentNotes: "Marked as compliant - no material impact",
      },
    });
  };

  const handleNotifyApra = () => {
    notifyMutation.mutate({
      projectId,
      traceId,
      notificationRef: notificationRef || undefined,
    });
  };

  const handleExportEvidence = () => {
    exportMutation.mutate({
      projectId,
      traceIds: [traceId],
      exportFormat: "JSON",
    });
  };

  const needsNotification = compliance?.materialImpact && 
    (compliance?.cps234Classification === "HIGH" || compliance?.cps234Classification === "CRITICAL") &&
    !compliance?.notifiedApra;

  return (
    <Card className={needsNotification ? "border-red-500 border-2" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              APRA GRC
            </CardTitle>
            <CardDescription>
              CPS 234 Information Security & CPS 230 Operational Risk
            </CardDescription>
          </div>
          <ApraGrcBadge compliance={compliance} showDetails />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsNotification && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">72-Hour Notification Required</h4>
              <p className="text-sm text-red-700 mt-1">
                This trace has HIGH or CRITICAL impact classification. APRA must be notified within 72 hours.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Notification Reference (optional)"
                  value={notificationRef}
                  onChange={(e) => setNotificationRef(e.target.value)}
                  className="w-64"
                />
                <Button
                  onClick={handleNotifyApra}
                  disabled={notifyMutation.isLoading}
                  variant="destructive"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {notifyMutation.isLoading ? "Recording..." : "Mark APRA Notified"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isEditing ? (
          <div className="space-y-3">
            {compliance ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Material Impact:</span>
                    <p className="font-medium">
                      {compliance.materialImpact ? "Yes" : "No"}
                    </p>
                  </div>
                  {compliance.impactType && (
                    <div>
                      <span className="text-muted-foreground">Impact Type:</span>
                      <p className="font-medium">{compliance.impactType}</p>
                    </div>
                  )}
                  {compliance.cps234Classification && (
                    <div>
                      <span className="text-muted-foreground">CPS 234 Classification:</span>
                      <div className="mt-1">
                        <CPS234ClassificationBadge classification={compliance.cps234Classification} />
                      </div>
                    </div>
                  )}
                  {compliance.notifiedApra && (
                    <div>
                      <span className="text-muted-foreground">APRA Notified:</span>
                      <p className="font-medium text-green-600">
                        {compliance.notifiedAt 
                          ? new Date(compliance.notifiedAt).toLocaleDateString() 
                          : "Yes"}
                      </p>
                      {compliance.notificationRef && (
                        <p className="text-xs text-muted-foreground">
                          Ref: {compliance.notificationRef}
                        </p>
                      )}
                    </div>
                  )}
                  {compliance.assessedAt && (
                    <div>
                      <span className="text-muted-foreground">Last Assessed:</span>
                      <p className="font-medium">
                        {new Date(compliance.assessedAt).toLocaleDateString()}
                      </p>
                      {compliance.assessedBy && (
                        <p className="text-xs text-muted-foreground">
                          By: {compliance.assessedBy}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {compliance.assessmentNotes && (
                  <div>
                    <span className="text-muted-foreground">Assessment Notes:</span>
                    <p className="text-sm mt-1 bg-muted p-2 rounded">
                      {compliance.assessmentNotes}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                No APRA GRC assessment has been recorded for this trace.
              </p>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                {compliance ? "Edit Assessment" : "Assess GRC"}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportEvidence}
                disabled={exportMutation.isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Evidence
              </Button>
            </div>
          </div>
        ) : (
          <ApraGrcForm
            projectId={projectId}
            traceId={traceId}
            onSubmit={handleMarkMaterialImpact}
            onMarkCompliant={handleMarkCompliant}
            onCancel={() => setIsEditing(false)}
            isLoading={updateMutation.isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface ApraGrcFormProps {
  projectId: string;
  traceId: string;
  onSubmit: (values: {
    impactType: ApraGrcDomain["impactType"];
    cps234Classification: ApraGrcDomain["cps234Classification"];
    assessmentNotes?: string;
  }) => void;
  onMarkCompliant: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ApraGrcForm({
  onSubmit,
  onMarkCompliant,
  onCancel,
  isLoading,
}: ApraGrcFormProps) {
  const [impactType, setImpactType] = useState<ApraGrcDomain["impactType"]>("OPERATIONAL");
  const [cps234Classification, setCps234Classification] = useState<ApraGrcDomain["cps234Classification"]>("LOW");
  const [assessmentNotes, setAssessmentNotes] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Impact Type (CPS 234)</Label>
          <Select
            value={impactType || "OPERATIONAL"}
            onValueChange={(v) => setImpactType(v as ApraGrcDomain["impactType"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPERATIONAL">Operational Risk</SelectItem>
              <SelectItem value="FINANCIAL">Financial Loss</SelectItem>
              <SelectItem value="REPUTATIONAL">Reputational Damage</SelectItem>
              <SelectItem value="REGULATORY">Regulatory Breach</SelectItem>
              <SelectItem value="CUSTOMER_HARM">Customer Impact</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>CPS 234 Classification</Label>
          <Select
            value={cps234Classification || "LOW"}
            onValueChange={(v) => setCps234Classification(v as ApraGrcDomain["cps234Classification"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low Impact</SelectItem>
              <SelectItem value="MEDIUM">Medium Impact</SelectItem>
              <SelectItem value="HIGH">High Impact (72h notify)</SelectItem>
              <SelectItem value="CRITICAL">Critical (immediate)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assessment Notes</Label>
        <Textarea
          value={assessmentNotes}
          onChange={(e) => setAssessmentNotes(e.target.value)}
          placeholder="Document the rationale for this classification..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() =>
              onSubmit({
                impactType,
                cps234Classification,
                assessmentNotes,
              })
            }
            disabled={isLoading}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Mark Material Impact
          </Button>
          <Button
            variant="outline"
            onClick={onMarkCompliant}
            disabled={isLoading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Compliant
          </Button>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

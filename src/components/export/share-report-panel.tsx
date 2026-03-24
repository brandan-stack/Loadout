"use client";

import { useState } from "react";
import { GlassBubbleCard } from "@/components/ui/glass-bubble-card";
import {
  openEmailCompose,
  getEmailClientOptions,
  getMailtoLink,
} from "@/lib/export/email-compose";
import { generateReportPDF } from "@/lib/export/pdf-generator";

interface ShareReportPanelProps {
  reportType: string;
  reportData: string;
  title?: string;
  onClose?: () => void;
}

export function ShareReportPanel({
  reportType,
  reportData,
  title,
  onClose,
}: ShareReportPanelProps) {
  const [sharing, setSharing] = useState(false);
  const [selectedClient, setSelectedClient] = useState("default");
  const emailClients = getEmailClientOptions();

  const handleShareEmail = async () => {
    setSharing(true);
    try {
      // Log the share activity
      await fetch("/api/sharing/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          reportType,
          emailClient: selectedClient,
        }),
      });

      // Prepare email
      const subject = `Loadout Inventory Report: ${title || reportType}`;
      const body = `Please see the attached inventory report.\n\nGenerated: ${new Date().toLocaleString()}\nReport Type: ${reportType}`;

      // Open email compose
      openEmailCompose(
        {
          subject,
          body,
        },
        selectedClient
      );
    } catch (error) {
      console.error("Share error:", error);
    } finally {
      setSharing(false);
    }
  };

  const handleExportPDF = async () => {
    setSharing(true);
    try {
      // Log the share activity
      await fetch("/api/sharing/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pdf",
          reportType,
        }),
      });

      // Generate PDF
      const filename = `loadout-${reportType}-${new Date().toISOString().split("T")[0]}.pdf`;
      await generateReportPDF(reportType, reportData, filename);
    } catch (error) {
      console.error("PDF export error:", error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <GlassBubbleCard className="mb-6">
      <h3 className="font-bold text-lg mb-4">Share Report</h3>

      <div className="space-y-4">
        {/* Email client selector */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Email Client:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {emailClients.clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedClient === client.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-2xl mb-1">{client.icon}</div>
                <div className="text-xs font-medium">{client.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleShareEmail}
            disabled={sharing}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {sharing ? "Sharing..." : "Share via Email"}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={sharing}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
          >
            {sharing ? "Exporting..." : "Export as PDF"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              disabled={sharing}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:bg-gray-200"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="text-xs text-gray-600">
          Share activities are logged for audit purposes.
        </p>
      </div>
    </GlassBubbleCard>
  );
}

import { LowStockReportPage } from "@/components/reports/low-stock-report";
import { requirePageAccess } from "@/lib/permissions";

export default async function LowStockReportPageRoute() {
  await requirePageAccess("canViewReports");
  return <LowStockReportPage />;
}

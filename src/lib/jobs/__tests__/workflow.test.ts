import {
  calculateJobTotals,
  canEditJobParts,
  getComputedUnitSell,
  getInvoiceStatus,
  getJobStatusLabel,
  getJobStatusTransitionError,
  hasJobInvoiceMetadata,
  normalizeJobStatus,
} from "@/lib/jobs/workflow";

describe("jobs workflow helpers", () => {
  it("calculates unit sell from cost and markup", () => {
    expect(getComputedUnitSell({ unitCost: 10, markupPercent: 25 })).toBe(12.5);
  });

  it("keeps explicit unit sell when already present", () => {
    expect(getComputedUnitSell({ unitCost: 10, markupPercent: 25, unitSell: 18 })).toBe(18);
  });

  it("calculates totals from part pricing when custom sell pricing exists", () => {
    const totals = calculateJobTotals(
      [
        { quantity: 2, unitCost: 10, markupPercent: 50 },
        { quantity: 1, unitCost: 5, markupPercent: 20 },
      ],
      { billingTotal: 999 }
    );

    expect(totals.totalCost).toBe(25);
    expect(totals.totalSell).toBe(36);
    expect(totals.margin).toBe(11);
    expect(totals.useLegacyBillingTotal).toBe(false);
  });

  it("uses legacy billing total when no custom pricing exists", () => {
    const totals = calculateJobTotals([{ quantity: 2, unitCost: 10, markupPercent: 0 }], { billingTotal: 40 });

    expect(totals.totalCost).toBe(20);
    expect(totals.totalSell).toBe(40);
    expect(totals.margin).toBe(20);
    expect(totals.useLegacyBillingTotal).toBe(true);
  });

  it("only allows parts editing on open and completed jobs", () => {
    expect(canEditJobParts("OPEN")).toBe(true);
    expect(canEditJobParts("COMPLETED")).toBe(true);
    expect(canEditJobParts("INVOICED")).toBe(false);
  });

  it("describes invalid status transitions", () => {
    expect(getJobStatusTransitionError("OPEN", "INVOICED")).toBe("Open jobs can only move to Completed.");
    expect(getJobStatusTransitionError("INVOICED", "OPEN")).toBe("Invoiced jobs can only move back to Completed.");
    expect(getJobStatusTransitionError("COMPLETED", "OPEN")).toBeNull();
  });

  it("normalizes legacy closed status values", () => {
    expect(normalizeJobStatus("closed")).toBe("COMPLETED");
    expect(getJobStatusLabel("closed")).toBe("Completed");
    expect(canEditJobParts("closed")).toBe(true);
  });

  it("tracks invoice status from job state and invoice number", () => {
    expect(getInvoiceStatus({ status: "OPEN" })).toBe("NOT_INVOICED");
    expect(getInvoiceStatus({ status: "INVOICED" })).toBe("INVOICED_PENDING_NUMBER");
    expect(getInvoiceStatus({ status: "INVOICED", invoiceNumber: "INV-42" })).toBe("INVOICED");
  });

  it("detects invoice metadata even on legacy jobs", () => {
    expect(hasJobInvoiceMetadata({ status: "closed", invoiceNumber: "INV-9" })).toBe(true);
    expect(hasJobInvoiceMetadata({ status: "open" })).toBe(false);
  });
});
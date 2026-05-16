import {
  buildJobFilterOptions,
  filterJobCollection,
  getVisiblePartsCount,
  summarizeJobCollection,
} from "@/lib/jobs/collection";

function makeJob(overrides: Partial<{
  id: string;
  jobNumber: string;
  displayTitle: string;
  customer: string;
  status: string;
  latestActivityAt: string;
  createdAt: string;
  date: string;
  partsCount: number;
  needsPartsAttention: boolean;
  technicianName: string;
}>) {
  return {
    id: overrides.id ?? "job-1",
    jobNumber: overrides.jobNumber ?? "JOB-1",
    displayTitle: overrides.displayTitle ?? "Replace rooftop unit",
    customer: overrides.customer ?? "Atlas Mechanical",
    status: overrides.status ?? "OPEN",
    latestActivityAt: overrides.latestActivityAt ?? "2026-05-16T10:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-05-15T10:00:00.000Z",
    date: overrides.date ?? "2026-05-16T08:00:00.000Z",
    partsCount: overrides.partsCount ?? 0,
    needsPartsAttention: overrides.needsPartsAttention ?? false,
    technician: { name: overrides.technicianName ?? "Taylor Reese" },
  };
}

describe("job collection helpers", () => {
  it("summarizes deduped jobs and normalizes legacy closed status", () => {
    const jobs = [
      makeJob({ id: "open-1", status: "OPEN", partsCount: 2 }),
      makeJob({ id: "completed-1", status: "closed", partsCount: 3, needsPartsAttention: true }),
      makeJob({ id: "invoiced-1", status: "INVOICED", partsCount: 1 }),
      makeJob({ id: "open-1", status: "OPEN", partsCount: 99 }),
    ];

    expect(summarizeJobCollection(jobs)).toEqual({
      open: 1,
      completed: 1,
      invoiced: 1,
      parts: 6,
      attention: 1,
    });
  });

  it("builds sorted unique filter options", () => {
    const jobs = [
      makeJob({ id: "a", customer: "Beta Works", technicianName: "Jamie" }),
      makeJob({ id: "b", customer: "atlas mechanical", technicianName: "Alex" }),
      makeJob({ id: "c", customer: "Beta Works", technicianName: "Jamie" }),
    ];

    expect(buildJobFilterOptions(jobs)).toEqual({
      customers: ["atlas mechanical", "Beta Works"],
      technicians: ["Alex", "Jamie"],
    });
  });

  it("filters by folder, customer, technician, and search text without duplicates", () => {
    const jobs = [
      makeJob({ id: "a", status: "OPEN", customer: "Northwind", technicianName: "Alex", displayTitle: "Install condenser", partsCount: 2 }),
      makeJob({ id: "b", status: "COMPLETED", customer: "Northwind", technicianName: "Taylor", displayTitle: "Repair blower", partsCount: 1 }),
      makeJob({ id: "c", status: "OPEN", customer: "Acme", technicianName: "Alex", displayTitle: "Inspect condenser", partsCount: 4 }),
      makeJob({ id: "a", status: "OPEN", customer: "Northwind", technicianName: "Alex", displayTitle: "Install condenser", partsCount: 2 }),
    ];

    const filtered = filterJobCollection(jobs, {
      status: "OPEN",
      customer: "Northwind",
      technician: "Alex",
      query: "condenser",
      activity: "all",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
    expect(getVisiblePartsCount(filtered)).toBe(2);
  });
});

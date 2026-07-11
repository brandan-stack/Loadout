export const jobSummarySelect = {
  id: true,
  jobNumber: true,
  description: true,
  customer: true,
  date: true,
  status: true,
  billingTotal: true,
  notes: true,
  createdAt: true,
  latestActivityAt: true,
  technician: { select: { id: true, name: true } },
  parts: {
    select: {
      id: true,
      itemId: true,
      quantity: true,
      unitCost: true,
      notes: true,
      itemNameSnapshot: true,
      createdAt: true,
      lastActivityAt: true,
      item: {
        select: {
          id: true,
          name: true,
          partNumber: true,
          unitOfMeasure: true,
          quantityOnHand: true,
          lowStockRedThreshold: true,
        },
      },
    },
  },
  _count: { select: { parts: true } },
} as const;

export const jobDetailSelect = {
  ...jobSummarySelect,
  technicianId: true,
} as const;
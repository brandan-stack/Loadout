export type SupplierEmailContact = {
  label: string;
  email: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeSupplierEmailContacts(value: unknown): SupplierEmailContact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const email = typeof entry.email === "string" ? entry.email.trim().toLowerCase() : "";

      if (!label || !email) {
        return null;
      }

      return { label, email };
    })
    .filter((entry): entry is SupplierEmailContact => Boolean(entry));
}

export function getPrimarySupplierEmail(contacts: SupplierEmailContact[], fallback?: string | null) {
  return contacts[0]?.email ?? fallback ?? undefined;
}
export type NotificationRecipients = {
  salesEmail: string;
  partsEmail: string;
  invoicingEmail: string;
};

const KEY = "inventory.notificationRecipients.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadNotificationRecipients(): NotificationRecipients {
  return load<NotificationRecipients>(KEY, { salesEmail: "", partsEmail: "", invoicingEmail: "" });
}

export function saveNotificationRecipients(patch: Partial<NotificationRecipients>) {
  const cur = loadNotificationRecipients();
  localStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }));
}

export function buildJobCompleteMailto(opts: {
  job: { name: string; customer?: string; po?: string };
  lines: Array<{ itemName: string; partNumber?: string; qty: number; note?: string; ts: number }>;
  recipients: NotificationRecipients;
}): string {
  const { job, lines, recipients } = opts;

  const toAddrs = [recipients.salesEmail, recipients.partsEmail, recipients.invoicingEmail]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");

  const subject = encodeURIComponent(`Job Complete: ${job.name}`);

  const partsTable = lines.length
    ? lines
        .map(
          (l, i) =>
            `${i + 1}. ${l.itemName}${l.partNumber ? ` (Part#: ${l.partNumber})` : ""} — Qty: ${l.qty}${l.note ? ` — Note: ${l.note}` : ""}`
        )
        .join("\n")
    : "(no parts logged)";

  const bodyText =
    `Job: ${job.name}\n` +
    (job.customer ? `Customer: ${job.customer}\n` : "") +
    (job.po ? `PO/WO: ${job.po}\n` : "") +
    `Status: COMPLETE\n` +
    `Completed: ${new Date().toLocaleString()}\n\n` +
    `Parts Used:\n${partsTable}\n`;

  const body = encodeURIComponent(bodyText);

  return `mailto:${toAddrs}?subject=${subject}&body=${body}`;
}

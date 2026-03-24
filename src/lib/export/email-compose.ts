// src/lib/export/email-compose.ts - Email compose link builder

export interface EmailComposeOptions {
  to?: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

/**
 * Generate email client detection
 */
export function detectEmailClient(): string {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("gmail")) return "gmail";
  if (ua.includes("outlook")) return "outlook";
  if (ua.includes("yahoo")) return "yahoo";
  if (ua.includes("apple") || ua.includes("safari")) return "apple-mail";

  return "default";
}

/**
 * Generate Gmail compose link
 */
export function getGmailLink(options: EmailComposeOptions): string {
  const params = new URLSearchParams();
  if (options.to) params.append("to", options.to);
  params.append("subject", options.subject);
  params.append("body", options.body);
  if (options.cc) params.append("cc", options.cc);
  if (options.bcc) params.append("bcc", options.bcc);

  return `https://mail.google.com/mail/?view=cm&${params.toString()}`;
}

/**
 * Generate Outlook Web compose link
 */
export function getOutlookLink(options: EmailComposeOptions): string {
  const params = new URLSearchParams();
  if (options.to) params.append("to", options.to);
  params.append("subject", options.subject);
  params.append("body", options.body);
  if (options.cc) params.append("cc", options.cc);
  if (options.bcc) params.append("bcc", options.bcc);

  return `https://outlook.office.com/?${params.toString()}`;
}

/**
 * Generate mailto: link (default email client)
 */
export function getMailtoLink(options: EmailComposeOptions): string {
  const params = [];
  if (options.subject) params.push(`subject=${encodeURIComponent(options.subject)}`);
  if (options.body) params.push(`body=${encodeURIComponent(options.body)}`);
  if (options.cc) params.push(`cc=${encodeURIComponent(options.cc)}`);
  if (options.bcc) params.push(`bcc=${encodeURIComponent(options.bcc)}`);

  const paramString = params.length > 0 ? `?${params.join("&")}` : "";
  return `mailto:${options.to || ""}${paramString}`;
}

/**
 * Get available email options for user
 */
export function getEmailClientOptions(): {
  clients: Array<{
    name: string;
    id: string;
    icon: string;
  }>;
} {
  return {
    clients: [
      { name: "Gmail", id: "gmail", icon: "📧" },
      { name: "Outlook", id: "outlook", icon: "📨" },
      { name: "Apple Mail", id: "apple", icon: "🍎" },
      { name: "Default Client", id: "default", icon: "📬" },
    ],
  };
}

/**
 * Open email compose in the user's preferred client
 */
export function openEmailCompose(
  options: EmailComposeOptions,
  clientId: string = "default"
): void {
  let link = "";

  switch (clientId) {
    case "gmail":
      link = getGmailLink(options);
      window.open(link, "_blank");
      break;
    case "outlook":
      link = getOutlookLink(options);
      window.open(link, "_blank");
      break;
    case "apple":
      link = getMailtoLink(options);
      window.location.href = link;
      break;
    default:
      link = getMailtoLink(options);
      window.location.href = link;
  }
}

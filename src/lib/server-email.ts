import nodemailer from "nodemailer";

interface PasswordResetEmailOptions {
  to: string;
  name: string;
  resetUrl: string;
  organizationName?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;

  if (!host || !from) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return {
    host,
    port,
    secure,
    from,
    replyTo: process.env.SMTP_REPLY_TO,
    auth: user && pass ? { user, pass } : undefined,
  };
}

export function isPasswordRecoveryEmailConfigured() {
  return getSmtpConfig() !== null;
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getSmtpConfig();
  if (!config) {
    throw new Error("SMTP is not configured");
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return cachedTransporter;
}

export async function sendPasswordResetEmail(options: PasswordResetEmailOptions) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("SMTP is not configured");
  }

  const transporter = getTransporter();
  const workspaceName = options.organizationName?.trim() || "Loadout";
  const subject = `Reset your ${workspaceName} password`;
  const intro = options.name ? `Hi ${options.name},` : "Hi,";
  const text = [
    intro,
    "",
    `We received a request to reset your password for ${workspaceName}.`,
    "Open the link below to choose a new password:",
    options.resetUrl,
    "",
    "This link expires in 1 hour. If you did not request a reset, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p>${intro}</p>
      <p>We received a request to reset your password for <strong>${workspaceName}</strong>.</p>
      <p>
        <a href="${options.resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
      </p>
      <p>If the button does not open, copy and paste this link into your browser:</p>
      <p><a href="${options.resetUrl}">${options.resetUrl}</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to: options.to,
    subject,
    text,
    html,
  });
}
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const recoveryTemplate = ({ heading, recipientName, actionLabel, actionUrl, expiresIn }) => ({
  text: `${heading}\n\nHello ${recipientName || 'there'},\n\nOpen this link to continue: ${actionUrl}\n\nThis link expires in ${expiresIn}. If you did not request it, ignore this email.`,
  html: `<h2>${escapeHtml(heading)}</h2><p>Hello ${escapeHtml(recipientName || 'there')},</p><p><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionLabel)}</a></p><p>This link expires in ${escapeHtml(expiresIn)}. If you did not request it, ignore this email.</p>`,
});

export class EmailDeliveryService {
  static assertConfigured() {
    if (env.NODE_ENV !== 'production') return;
    if (env.EMAIL_PROVIDER !== 'resend' || !env.RESEND_API_KEY || !env.EMAIL_FROM || !env.PUBLIC_APP_URL) {
      throw new ApiError(503, 'Account email delivery is temporarily unavailable.', null, 'EMAIL_DELIVERY_UNAVAILABLE');
    }
  }

  static async send({ to, subject, text, html }, fetchImpl = globalThis.fetch) {
    this.assertConfigured();
    if (env.EMAIL_PROVIDER === 'console' && env.NODE_ENV !== 'production') {
      return { id: 'development-email', accepted: [to] };
    }
    if (env.EMAIL_PROVIDER !== 'resend' || typeof fetchImpl !== 'function') {
      throw new ApiError(503, 'Account email delivery is temporarily unavailable.', null, 'EMAIL_DELIVERY_UNAVAILABLE');
    }

    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
    });
    if (!response.ok) {
      throw new ApiError(503, 'Account email delivery is temporarily unavailable.', null, 'EMAIL_DELIVERY_FAILED');
    }
    return response.json();
  }

  static async sendPasswordReset({ to, name, token }) {
    const actionUrl = `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    const content = recoveryTemplate({ heading: 'Reset your HMS password', recipientName: name, actionLabel: 'Reset password', actionUrl, expiresIn: '30 minutes' });
    return this.send({ to, subject: 'Reset your HMS password', ...content });
  }

  static async sendEmailVerification({ to, name, token }) {
    const actionUrl = `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
    const content = recoveryTemplate({ heading: 'Verify your HMS email address', recipientName: name, actionLabel: 'Verify email', actionUrl, expiresIn: '24 hours' });
    return this.send({ to, subject: 'Verify your HMS email address', ...content });
  }
}

// lib/email/templates/support.ts
import { compactLayout } from './_layout'

export function enterpriseInquiryAdminEmail(params: {
  name: string
  email: string
  company?: string
  inquiryType: string
  message: string
}): { subject: string; html: string } {
  return {
    subject: `[Contact] ${params.inquiryType} — ${params.name}`,
    html: compactLayout({
      subheadline: 'New Contact',
      headline: `${params.inquiryType} inquiry.`,
      body: `New contact form submission from the marketing site.`,
      details: [
        { label: 'Name', value: params.name },
        { label: 'Email', value: params.email },
        ...(params.company ? [{ label: 'Company', value: params.company }] : []),
        { label: 'Type', value: params.inquiryType },
      ],
      note: `Message: "${params.message}"`,
      cta: { label: 'Reply', href: `mailto:${params.email}` },
    }),
  }
}

export function enterpriseInquiryConfirmEmail(params: {
  name: string
}): { subject: string; html: string } {
  return {
    subject: `We received your message — éPure Drive`,
    html: compactLayout({
      subheadline: 'éPure Drive',
      headline: `Thanks, ${params.name}.`,
      body: `We received your message and will be in touch within 1–2 business days. If your request is urgent, you can reach us directly at <a href="mailto:info@epuredrive.com" style="color:#000;font-weight:700;">info@epuredrive.com</a>.`,
    }),
  }
}

export function dashboardSupportAdminEmail(params: {
  ticketNumber: string
  operatorName: string
  operatorEmail: string
  tenantName: string
  plan: string
  tenantId: string
  subject: string
  message: string
}): { subject: string; html: string } {
  return {
    subject: `[${params.ticketNumber}] ${params.subject} — ${params.tenantName}`,
    html: compactLayout({
      subheadline: `Support Request · ${params.ticketNumber}`,
      headline: 'Dashboard support request.',
      details: [
        { label: 'Ticket', value: params.ticketNumber },
        { label: 'From', value: params.operatorName },
        { label: 'Email', value: params.operatorEmail },
        { label: 'Company', value: params.tenantName },
        { label: 'Plan', value: params.plan },
        { label: 'Tenant ID', value: params.tenantId },
        { label: 'Subject', value: params.subject },
      ],
      note: `Message: "${params.message}"`,
      cta: { label: 'Reply', href: `mailto:${params.operatorEmail}` },
    }),
  }
}

export function dashboardSupportConfirmEmail(params: {
  ticketNumber: string
  operatorName: string
  subject: string
}): { subject: string; html: string } {
  return {
    subject: `Support request received [${params.ticketNumber}] — éPure Drive`,
    html: compactLayout({
      subheadline: `Support · ${params.ticketNumber}`,
      headline: 'We got your request.',
      body: `Hi ${params.operatorName}, we received your support request: "<strong>${params.subject}</strong>". Your case number is <strong>${params.ticketNumber}</strong> — please reference it in any follow-up. We typically reply within 24 hours.`,
      note: 'For urgent issues, reply to this email directly.',
    }),
  }
}

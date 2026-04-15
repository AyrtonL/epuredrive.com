// lib/email/templates/platform.ts
import { heroLayout, compactLayout, CAR } from './_layout'

const APP_URL = 'https://epuredrive.com'

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Up to 5 vehicles', 'Booking management', 'Digital agreements', 'Customer portal'],
  pro: ['Up to 20 vehicles', 'Team members', 'Stripe payments', 'Custom domain', 'API access'],
  max: ['Unlimited vehicles', 'Unlimited team', 'White-label', 'Priority support', 'SLA'],
  enterprise: ['Everything in Max', 'Dedicated account manager', 'Custom integrations'],
}

const PLAN_ORDER = ['free', 'starter', 'pro', 'max', 'enterprise']

export function welcomeEmail(params: {
  operatorName: string
}): { subject: string; html: string } {
  return {
    subject: 'Welcome to éPure Drive — Your account is ready',
    html: heroLayout({
      subheadline: 'éPure Drive',
      headline: `Welcome, ${params.operatorName}.`,
      body: `Your account is ready. Start building your fleet, customizing your rental site, and accepting bookings online.<br/><br/>
             <strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#aaa;">Upgrade your plan</strong><br/>
             <span style="font-size:13px;color:#555;">Unlock team members, custom domains, and Stripe payments on Pro and Max.</span>
             <br/><a href="${APP_URL}/dashboard/settings/billing"
                style="font-size:12px;font-weight:700;color:#000;text-decoration:underline;">
                View plans →</a>`,
      cta: { label: 'Go to Dashboard', href: `${APP_URL}/dashboard` },
      carImageUrl: CAR(2),
    }),
  }
}

export function onboardingEmail(params: {
  operatorName: string
}): { subject: string; html: string } {
  return {
    subject: 'Get started with éPure Drive — 3 steps to launch',
    html: heroLayout({
      subheadline: 'Getting Started',
      headline: 'Set up in 3 steps.',
      body: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;">Step 1</span><br/>
          <a href="${APP_URL}/dashboard/fleet"
             style="font-size:14px;font-weight:700;color:#000;text-decoration:none;">
            Add your first vehicle →
          </a>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;">Step 2</span><br/>
          <a href="${APP_URL}/dashboard/settings"
             style="font-size:14px;font-weight:700;color:#000;text-decoration:none;">
            Customize your rental site →
          </a>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;color:#bbb;">Step 3</span><br/>
          <a href="${APP_URL}/dashboard/settings/payments"
             style="font-size:14px;font-weight:700;color:#000;text-decoration:none;">
            Connect payments →
          </a>
        </td></tr>
      </table>`,
      cta: { label: 'Open Dashboard', href: `${APP_URL}/dashboard` },
      carImageUrl: CAR(3),
    }),
  }
}

export function subscriptionActivatedEmail(params: {
  operatorName: string
  plan: string
  billingDate?: string
}): { subject: string; html: string } {
  const planName = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  const features = PLAN_FEATURES[params.plan] ?? ['Full platform access']
  return {
    subject: `Your ${planName} plan is now active — éPure Drive`,
    html: heroLayout({
      subheadline: `${planName} Plan`,
      headline: `You're on ${planName}.`,
      body: `Your subscription is active. What's included:
             <ul style="margin:12px 0 0;padding-left:18px;color:#555;font-size:13px;line-height:2.1;">
               ${features.map(f => `<li>${f}</li>`).join('')}
             </ul>
             ${params.billingDate
               ? `<p style="margin:16px 0 0;font-size:11px;color:#aaa;">
                    Next billing: ${params.billingDate}
                  </p>`
               : ''}`,
      cta: { label: 'Go to Dashboard', href: `${APP_URL}/dashboard` },
      carImageUrl: CAR(1),
    }),
  }
}

export function subscriptionChangedEmail(params: {
  operatorName: string
  previousPlan: string
  newPlan: string
}): { subject: string; html: string } {
  const newName = params.newPlan.charAt(0).toUpperCase() + params.newPlan.slice(1)
  const prevName = params.previousPlan.charAt(0).toUpperCase() + params.previousPlan.slice(1)
  const isUpgrade =
    PLAN_ORDER.indexOf(params.newPlan) > PLAN_ORDER.indexOf(params.previousPlan)

  return {
    subject: isUpgrade
      ? `You've upgraded to ${newName} — éPure Drive`
      : `Your plan has changed to ${newName} — éPure Drive`,
    html: heroLayout({
      subheadline: isUpgrade ? 'Plan Upgrade' : 'Plan Change',
      headline: isUpgrade ? `Upgraded to ${newName}.` : `Now on ${newName}.`,
      body: isUpgrade
        ? `You've moved from <strong>${prevName}</strong> to <strong>${newName}</strong>. Your new features are now available in the dashboard.`
        : `Your plan has changed from <strong>${prevName}</strong> to <strong>${newName}</strong>. Some features may no longer be available.`,
      cta: { label: 'View Your Plan', href: `${APP_URL}/dashboard/settings/billing` },
      carImageUrl: CAR(5),
    }),
  }
}

export function subscriptionCancelledEmail(params: {
  operatorName: string
  plan: string
}): { subject: string; html: string } {
  const planName = params.plan.charAt(0).toUpperCase() + params.plan.slice(1)
  return {
    subject: `Your ${planName} plan has been cancelled — éPure Drive`,
    html: compactLayout({
      subheadline: 'Subscription',
      headline: 'Your plan has been cancelled.',
      body: `Your ${planName} subscription has ended. You can resubscribe at any time from your billing settings.`,
      cta: { label: 'Resubscribe', href: `${APP_URL}/dashboard/settings/billing` },
      note: 'If you believe this is an error, please reply to this email or contact us at info@epuredrive.com.',
    }),
  }
}

export function paymentReceiptEmail(params: {
  operatorName: string
  plan: string
  amount: string
  billingDate: string
  last4?: string
}): { subject: string; html: string } {
  return {
    subject: `Payment received — éPure Drive`,
    html: compactLayout({
      subheadline: 'Receipt',
      headline: 'Payment received.',
      body: 'Thank you. Your subscription is active. Stripe will also send you an official receipt.',
      details: [
        { label: 'Plan', value: params.plan.charAt(0).toUpperCase() + params.plan.slice(1) },
        { label: 'Amount', value: params.amount },
        { label: 'Date', value: params.billingDate },
        ...(params.last4 ? [{ label: 'Card', value: `•••• ${params.last4}` }] : []),
      ],
    }),
  }
}

export function paymentFailedEmail(params: {
  operatorName: string
  amount: string
  reason?: string
}): { subject: string; html: string } {
  return {
    subject: `Payment failed — action required — éPure Drive`,
    html: compactLayout({
      subheadline: 'Action Required',
      headline: 'Payment failed.',
      body: `We couldn't process your payment of <strong>${params.amount}</strong>.${
        params.reason ? ` Reason: ${params.reason}.` : ''
      } Please update your payment method to keep your plan active.`,
      cta: { label: 'Update Payment Method', href: `${APP_URL}/dashboard/settings/billing` },
    }),
  }
}

export function teamInviteEmail(params: {
  invitedBy: string
  companyName: string
  role: string
  inviteUrl: string
}): { subject: string; html: string } {
  return {
    subject: `You've been invited to join ${params.companyName} on éPure Drive`,
    html: heroLayout({
      subheadline: 'Team Invitation',
      headline: `Join ${params.companyName}.`,
      body: `<strong>${params.invitedBy}</strong> has invited you to join their fleet management team on éPure Drive as <strong>${params.role}</strong>.<br/><br/>
             Click the button to accept your invitation and set up your account.`,
      cta: { label: 'Accept Invitation', href: params.inviteUrl },
      carImageUrl: CAR(4),
    }),
  }
}

export function passwordResetEmail(params: {
  resetUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Reset your éPure Drive password',
    html: heroLayout({
      subheadline: 'Password Reset',
      headline: 'Reset your password.',
      body: `We received a request to reset the password for your éPure Drive account. Click the button below to choose a new one.<br/><br/>
             <span style="font-size:11px;color:#aaa;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will stay the same.</span>`,
      cta: { label: 'Reset Password', href: params.resetUrl },
      carImageUrl: CAR(6),
    }),
  }
}

export function passwordChangedEmail(params: {
  when: string
}): { subject: string; html: string } {
  return {
    subject: 'Your éPure Drive password was changed',
    html: compactLayout({
      subheadline: 'Security Notice',
      headline: 'Password updated.',
      body: 'The password for your éPure Drive account was just changed. If this was you, no further action is needed.',
      details: [
        { label: 'When', value: params.when },
      ],
      note: `If you didn't make this change, your account may be compromised. Reset your password immediately at ${APP_URL}/forgot-password and contact us at info@epuredrive.com.`,
    }),
  }
}

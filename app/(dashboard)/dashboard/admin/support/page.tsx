import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import SupportTicketsManager, { type SupportTicketRow } from './SupportTicketsManager'

export default async function SupportTicketsPage() {
  const { supabase } = await requireSuperuser()

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(`
      id,
      ticket_number,
      tenant_id,
      user_id,
      operator_name,
      operator_email,
      subject,
      message,
      status,
      created_at,
      updated_at,
      tenants:tenant_id ( name, brand_name, plan )
    `)
    .order('created_at', { ascending: false })

  const rows: SupportTicketRow[] = (tickets ?? []).map((t) => {
    const tenant = Array.isArray(t.tenants) ? t.tenants[0] : t.tenants
    return {
      id: t.id as string,
      ticketNumber: t.ticket_number as string,
      tenantId: t.tenant_id as string,
      tenantName:
        (tenant?.brand_name as string | undefined) ||
        (tenant?.name as string | undefined) ||
        'Unknown',
      tenantPlan: (tenant?.plan as string | undefined) || 'unknown',
      operatorName: t.operator_name as string,
      operatorEmail: t.operator_email as string,
      subject: t.subject as string,
      message: t.message as string,
      status: t.status as 'open' | 'in_progress' | 'closed',
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string,
    }
  })

  const openCount = rows.filter((r) => r.status === 'open').length
  const inProgressCount = rows.filter((r) => r.status === 'in_progress').length
  const closedCount = rows.filter((r) => r.status === 'closed').length

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader
        title="Support Tickets"
        description={`${rows.length} total · ${openCount} open · ${inProgressCount} in progress · ${closedCount} closed`}
      />
      <SupportTicketsManager tickets={rows} />
    </div>
  )
}

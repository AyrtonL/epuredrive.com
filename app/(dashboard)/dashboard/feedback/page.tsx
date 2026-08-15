import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import FeedbackForm from './FeedbackForm'

export default async function FeedbackPage() {
  await requireTenantId()

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader
        title="Feedback"
        description="Tell us what's working and what isn't — it goes straight to the team building this."
      />
      <FeedbackForm />
    </div>
  )
}

// app/(dashboard)/dashboard/telematics/layout.tsx
// Pass-through layout for the Telematics route group. Each child page renders
// its own <PageHeader />. The dashboard layout (one level up) already handles
// the feature-flag gate — there is no additional check here.
export default function TelematicsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full">{children}</div>
}

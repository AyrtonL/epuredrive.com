interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-surfaceBorder pb-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-white/50 text-base font-light tracking-wide mt-2">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-6 md:mt-0 animate-fade-in-up animation-delay-100">
          {action}
        </div>
      )}
    </div>
  )
}

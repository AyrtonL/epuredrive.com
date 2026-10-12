interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-white/55 text-[13px] mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-4 md:mt-0 animate-fade-in-up animation-delay-100">
          {action}
        </div>
      )}
    </div>
  )
}
